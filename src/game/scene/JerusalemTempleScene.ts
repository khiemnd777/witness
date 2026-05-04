import {
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  TransformNode,
  Vector3
} from "@babylonjs/core";
import type { InputManager } from "../engine/InputManager";
import {
  createCollisionBox,
  type CollisionBox,
  type MovementBounds
} from "../physics/CollisionTypes";
import { PlayerController } from "../player/PlayerController";
import {
  LowPolyFactory,
  type BuildingVisual,
  type HumanoidAnimationParts
} from "../visuals/LowPolyFactory";
import type {
  ChapterScene,
  ChapterSceneCallbacks,
  ObjectiveHint,
  SceneInteraction
} from "./ChapterScene";

type MarkerConfig = {
  id: string;
  label: string;
  type: SceneInteraction["type"];
  targetId: string;
  itemId?: string;
  position: Vector3;
  color: Color3;
};

type SceneMarker = {
  node: TransformNode;
  interaction: SceneInteraction;
};

type InteriorZone = {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  roof: BuildingVisual["roof"];
  roofMaterial: BuildingVisual["roofMaterial"];
  targetAlpha: number;
  hiddenAlpha?: number;
};

type WanderingCitizen = {
  node: TransformNode;
  waypoints: Vector3[];
  waypointIndex: number;
  speed: number;
  pauseSeconds: number;
  walkTime: number;
  animationParts?: HumanoidAnimationParts;
};

export class JerusalemTempleScene implements ChapterScene {
  scene: Scene;
  private player: PlayerController;
  private visuals: LowPolyFactory;
  private markers: SceneMarker[] = [];
  private activeInteractionIds = new Set<string>();
  private collectedItemIds = new Set<string>();
  private collisionBoxes: CollisionBox[] = [];
  private interiorZones: InteriorZone[] = [];
  private wanderingCitizens: WanderingCitizen[] = [];
  private nearest: SceneInteraction | null = null;
  private objectiveHint: ObjectiveHint | null = null;
  private markerPulseTime = 0;
  private shadowGenerator: ShadowGenerator | null = null;
  private movementBounds: MovementBounds = {
    minX: -14,
    maxX: 14,
    minZ: -14,
    maxZ: 14
  };

  constructor(
    scene: Scene,
    private input: InputManager,
    private callbacks: ChapterSceneCallbacks
  ) {
    this.scene = scene;
    this.visuals = new LowPolyFactory(scene);
    this.scene.clearColor = new Color4(0.72, 0.78, 0.82, 1);
    this.createLighting();
    this.createEnvironment();
    this.createPilgrims();
    this.createTempleTeachingScene();
    this.createWanderingCitizens();
    this.createMarkers();
    this.player = new PlayerController(scene, input, new Vector3(0, 0, -8.6));
    this.player.setCollision(this.collisionBoxes, this.movementBounds);
    if (this.shadowGenerator) {
      this.player.addToShadowGenerator(this.shadowGenerator);
    }
  }

  update(deltaSeconds: number) {
    this.player.update(deltaSeconds);
    this.updateBuildingRoofs(deltaSeconds);
    this.updateWanderingCitizens(deltaSeconds);
    this.markerPulseTime += deltaSeconds;
    this.updateMarkerVisibility();
    this.animateMarkers();
    this.updateNearestInteraction();
    this.updateObjectiveHint();
  }

  interact() {
    return this.nearest;
  }

  setActiveInteractionIds(ids: string[]) {
    this.activeInteractionIds = new Set(ids);
    this.updateMarkerVisibility();
    this.updateNearestInteraction();
    this.updateObjectiveHint();
  }

  setCollectedItemIds(ids: string[]) {
    this.collectedItemIds = new Set(ids);
    this.updateMarkerVisibility();
    this.updateNearestInteraction();
    this.updateObjectiveHint();
  }

  setWorldStateIds(_ids: string[]) {
    // Chapter 2 currently uses the existing quest progression contract without persistent scene states.
  }

  getPlayerPosition() {
    return this.player.getPosition();
  }

  dispose() {
    this.player.dispose();
    this.scene.dispose();
  }

  private createLighting() {
    const hemi = new HemisphericLight("jerusalemSkyLight", new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.68;
    hemi.diffuse = new Color3(0.88, 0.9, 1);

    const sun = new DirectionalLight("jerusalemSun", new Vector3(-0.5, -1, 0.35), this.scene);
    sun.position = new Vector3(12, 20, -10);
    sun.intensity = 1.2;
    sun.diffuse = new Color3(1, 0.88, 0.64);
    sun.shadowMinZ = 0.1;
    sun.shadowMaxZ = 65;

    const shadows = new ShadowGenerator(1536, sun);
    shadows.useBlurExponentialShadowMap = true;
    shadows.blurKernel = 18;
    shadows.darkness = 0.36;
    this.shadowGenerator = shadows;
  }

  private createEnvironment() {
    const ground = MeshBuilder.CreateGround("jerusalemGround", { width: 32, height: 32 }, this.scene);
    const groundMaterial = this.material("jerusalemGroundMaterial", new Color3(0.69, 0.61, 0.48));
    ground.material = groundMaterial;
    this.addShadowReceiver(ground);

    this.createMainRoad();
    this.createTemplePlatform();
    this.createSideBuildings();
    this.createMarketEdges();
    this.createCourtyardTrees();
  }

  private createMainRoad() {
    const roadMaterial = this.material("jerusalemRoadMaterial", new Color3(0.79, 0.71, 0.58));
    const road = MeshBuilder.CreateGround("jerusalemMainRoad", { width: 4.2, height: 18 }, this.scene);
    road.position = new Vector3(0, 0.012, -4.2);
    road.material = roadMaterial;
    this.addShadowReceiver(road);

    for (const x of [-2.2, 2.2]) {
      const edge = MeshBuilder.CreateBox("jerusalemRoadEdge", { width: 0.12, height: 0.04, depth: 17.5 }, this.scene);
      edge.position = new Vector3(x, 0.05, -4.2);
      edge.material = this.material(`jerusalemRoadEdge${x}`, new Color3(0.58, 0.5, 0.39));
      this.addShadowCaster(edge);
    }
  }

  private createTemplePlatform() {
    const platformMaterial = this.material("templePlatformMaterial", new Color3(0.82, 0.78, 0.67));
    const stepMaterial = this.material("templeStepMaterial", new Color3(0.66, 0.61, 0.51));
    const columnMaterial = this.material("templeColumnMaterial", new Color3(0.88, 0.85, 0.75));
    const trimMaterial = this.material("templeTrimMaterial", new Color3(0.63, 0.55, 0.38));

    const platform = MeshBuilder.CreateBox("templeCourtPlatform", { width: 15.4, height: 0.035, depth: 8.8 }, this.scene);
    platform.position = new Vector3(0, 0.0175, 4.8);
    platform.material = platformMaterial;
    this.addShadowReceiver(platform);
    this.addShadowCaster(platform);

    for (let index = 0; index < 4; index += 1) {
      const step = MeshBuilder.CreateBox(
        `templeFrontStep${index}`,
        { width: 12.4 - index * 0.65, height: 0.025, depth: 0.62 },
        this.scene
      );
      step.position = new Vector3(0, 0.0125, 0.2 + index * 0.52);
      step.material = stepMaterial;
      this.addShadowCaster(step);
    }

    const backWall = MeshBuilder.CreateBox("templeBackWall", { width: 14.8, height: 2.7, depth: 0.24 }, this.scene);
    backWall.position = new Vector3(0, 1.48, 8.95);
    backWall.material = this.material("templeBackWallMaterial", new Color3(0.72, 0.67, 0.55));
    backWall.metadata = { ...(backWall.metadata ?? {}), isBuildingMesh: true };
    this.addShadowCaster(backWall);
    this.collisionBoxes.push(createCollisionBox("templeBackWall", backWall.position, 7.4, 0.12, 0.2));

    for (const x of [-6.8, -4.1, -1.35, 1.35, 4.1, 6.8]) {
      const column = MeshBuilder.CreateCylinder(
        `templeColumn${x}`,
        { height: 2.6, diameterTop: 0.48, diameterBottom: 0.58, tessellation: 12 },
        this.scene
      );
      column.position = new Vector3(x, 1.3, 2.25);
      column.material = columnMaterial;
      column.metadata = { ...(column.metadata ?? {}), isBuildingMesh: true };
      this.addShadowCaster(column);
      this.collisionBoxes.push(createCollisionBox(column.name, new Vector3(x, 0, 2.25), 0.22, 0.22, 0.08));
    }

    const backLintel = MeshBuilder.CreateBox("templeBackLintel", { width: 15.2, height: 0.32, depth: 0.42 }, this.scene);
    backLintel.position = new Vector3(0, 2.85, 8.95);
    backLintel.material = trimMaterial;
    backLintel.metadata = { ...(backLintel.metadata ?? {}), isBuildingMesh: true };
    this.addShadowCaster(backLintel);

    const frontLintelMaterial = this.material("templeFrontLintelMaterial", new Color3(0.63, 0.55, 0.38));
    const frontLintel = MeshBuilder.CreateBox("templeFrontLintel", { width: 15.2, height: 0.32, depth: 0.42 }, this.scene);
    frontLintel.position = new Vector3(0, 2.85, 2.25);
    frontLintel.material = frontLintelMaterial;
    frontLintel.metadata = { ...(frontLintel.metadata ?? {}), isBuildingMesh: true };
    this.addShadowCaster(frontLintel);
    this.addTempleCourtOccluderZone(frontLintel, frontLintelMaterial);

    const altar = MeshBuilder.CreateBox("templeCourtLowAltar", { width: 1.4, height: 0.54, depth: 1.0 }, this.scene);
    altar.position = new Vector3(-4.8, 0.51, 6.55);
    altar.material = this.material("templeCourtLowAltarMaterial", new Color3(0.56, 0.49, 0.39));
    this.addShadowCaster(altar);
    this.collisionBoxes.push(createCollisionBox("templeCourtLowAltar", new Vector3(-4.8, 0, 6.55), 0.7, 0.5, 0.15));
  }

  private createSideBuildings() {
    const left = this.visuals.createBuilding({
      name: "jerusalemSideHouseLeft",
      position: new Vector3(-8.6, 0, -1.8),
      size: new Vector3(4.5, 1.65, 3.8),
      wallColor: new Color3(0.62, 0.52, 0.4)
    });
    const right = this.visuals.createBuilding({
      name: "jerusalemSideHouseRight",
      position: new Vector3(8.4, 0, -2.4),
      size: new Vector3(4.8, 1.7, 3.6),
      wallColor: new Color3(0.67, 0.57, 0.43)
    });
    this.addShadowCaster(left.root);
    this.addShadowCaster(right.root);
    this.addBuildingInteriorZone("jerusalemSideHouseLeft", new Vector3(-8.6, 0, -1.8), new Vector3(4.5, 1.65, 3.8), left);
    this.addBuildingInteriorZone("jerusalemSideHouseRight", new Vector3(8.4, 0, -2.4), new Vector3(4.8, 1.7, 3.6), right);
    this.addBuildingWallCollisions("jerusalemSideHouseLeft", new Vector3(-8.6, 0, -1.8), new Vector3(4.5, 1.65, 3.8));
    this.addBuildingWallCollisions("jerusalemSideHouseRight", new Vector3(8.4, 0, -2.4), new Vector3(4.8, 1.7, 3.6));
  }

  private addBuildingInteriorZone(
    id: string,
    position: Vector3,
    size: Vector3,
    building: BuildingVisual
  ) {
    this.interiorZones.push({
      id,
      minX: position.x - size.x / 2 + 0.35,
      maxX: position.x + size.x / 2 - 0.35,
      minZ: position.z - size.z / 2 + 0.35,
      maxZ: position.z + size.z / 2 - 0.35,
      roof: building.roof,
      roofMaterial: building.roofMaterial,
      targetAlpha: 1
    });
  }

  private addTempleCourtOccluderZone(occluder: Mesh, material: StandardMaterial) {
    this.interiorZones.push({
      id: "templeCourtOccluder",
      minX: -7.4,
      maxX: 7.4,
      minZ: 1.05,
      maxZ: 8.55,
      roof: occluder,
      roofMaterial: material,
      targetAlpha: 1,
      hiddenAlpha: 0.02
    });
  }

  private updateBuildingRoofs(deltaSeconds: number) {
    const playerPosition = this.player.getPosition();
    for (const zone of this.interiorZones) {
      const isInside =
        playerPosition.x >= zone.minX &&
        playerPosition.x <= zone.maxX &&
        playerPosition.z >= zone.minZ &&
        playerPosition.z <= zone.maxZ;

      zone.targetAlpha = isInside ? zone.hiddenAlpha ?? 0.12 : 1;
      const currentAlpha = zone.roofMaterial.alpha ?? 1;
      const nextAlpha = currentAlpha + (zone.targetAlpha - currentAlpha) * Math.min(1, deltaSeconds * 5);
      zone.roofMaterial.alpha = nextAlpha;
      zone.roof.setEnabled(nextAlpha > 0.04);
    }
  }

  private addBuildingWallCollisions(name: string, position: Vector3, size: Vector3) {
    const wallThickness = 0.18;
    const doorWidth = Math.min(1.2, size.x * 0.32);
    const frontSegmentWidth = (size.x - doorWidth) / 2;
    const halfDepth = size.z / 2;
    const halfWidth = size.x / 2;
    const padding = 0.2;

    this.collisionBoxes.push(
      createCollisionBox(`${name}BackWall`, new Vector3(position.x, 0, position.z + halfDepth), halfWidth, wallThickness, padding),
      createCollisionBox(`${name}LeftWall`, new Vector3(position.x - halfWidth, 0, position.z), wallThickness, halfDepth, padding),
      createCollisionBox(`${name}RightWall`, new Vector3(position.x + halfWidth, 0, position.z), wallThickness, halfDepth, padding),
      createCollisionBox(
        `${name}FrontLeftWall`,
        new Vector3(position.x - doorWidth / 2 - frontSegmentWidth / 2, 0, position.z - halfDepth),
        frontSegmentWidth / 2,
        wallThickness,
        padding
      ),
      createCollisionBox(
        `${name}FrontRightWall`,
        new Vector3(position.x + doorWidth / 2 + frontSegmentWidth / 2, 0, position.z - halfDepth),
        frontSegmentWidth / 2,
        wallThickness,
        padding
      )
    );
  }

  private createMarketEdges() {
    const cratePositions = [
      new Vector3(-7.1, 0, -6.5),
      new Vector3(-5.8, 0, -7.4),
      new Vector3(6.2, 0, -6.7),
      new Vector3(7.7, 0, -5.8)
    ];

    for (const [index, position] of cratePositions.entries()) {
      const crate = this.visuals.createCrate(`jerusalemCrate${index}`, position);
      this.addShadowCaster(crate);
      this.collisionBoxes.push(createCollisionBox(crate.name, position, 0.36, 0.36, 0.08));
    }

    for (const config of [
      { start: new Vector3(-8.6, 0, -9.2), count: 6 },
      { start: new Vector3(5.8, 0, -9.2), count: 6 }
    ]) {
      const fence = this.visuals.createFence(`jerusalemFence${config.start.x}`, config.start, config.count, 0.62);
      this.addShadowCaster(fence);
    }
  }

  private createCourtyardTrees() {
    const placements = [
      { position: new Vector3(-11.2, 0, 5.7), scale: 0.9 },
      { position: new Vector3(11.1, 0, 4.8), scale: 0.86 },
      { position: new Vector3(-10.3, 0, -9.8), scale: 0.74 },
      { position: new Vector3(10.4, 0, -9.4), scale: 0.78 },
      { position: new Vector3(-12.2, 0, -3.4), scale: 0.72 },
      { position: new Vector3(12.3, 0, -2.4), scale: 0.7 }
    ];

    for (const [index, placement] of placements.entries()) {
      const tree = index < 2
        ? this.visuals.createPalmTree(`jerusalemPalm${index}`, placement.position, placement.scale)
        : this.visuals.createOliveTree(`jerusalemOlive${index}`, placement.position, placement.scale);
      this.addShadowCaster(tree);
      this.collisionBoxes.push(
        createCollisionBox(`jerusalemTree${index}`, placement.position, 0.28 * placement.scale, 0.28 * placement.scale, 0.08)
      );
    }

    for (const [index, position] of [
      new Vector3(-3.4, 0, -5.8),
      new Vector3(3.6, 0, -5.7),
      new Vector3(-6.8, 0, 3.8),
      new Vector3(6.7, 0, 3.4)
    ].entries()) {
      this.addShadowCaster(this.visuals.createRock(`jerusalemRock${index}`, position, 0.58));
    }
  }

  private createPilgrims() {
    const elder = this.visuals.createHumanoid({
      name: "pilgrimElder02Visual",
      position: new Vector3(-5.4, 0, -2.2),
      tunicColor: new Color3(0.42, 0.31, 0.2),
      headCoverColor: new Color3(0.78, 0.7, 0.56),
      scale: 0.66
    });
    elder.rotation.y = -Math.PI * 0.22;
    this.addWalkingStaff(elder, "pilgrimElder02Staff");
    this.addShadowCaster(elder);
    this.collisionBoxes.push(createCollisionBox("pilgrimElder02Visual", elder.position, 0.26, 0.26, 0.08));

    const family = [
      { position: new Vector3(-6.55, 0, -2.65), color: new Color3(0.28, 0.37, 0.32), scale: 0.58 },
      { position: new Vector3(-4.7, 0, -3.05), color: new Color3(0.46, 0.24, 0.2), scale: 0.56 },
      { position: new Vector3(-5.95, 0, -1.05), color: new Color3(0.24, 0.31, 0.47), scale: 0.5 }
    ];
    for (const [index, member] of family.entries()) {
      const pilgrim = this.visuals.createHumanoid({
        name: `pilgrimFamily02${index}`,
        position: member.position,
        tunicColor: member.color,
        headCoverColor: new Color3(0.7, 0.62, 0.5),
        scale: member.scale
      });
      pilgrim.rotation.y = Math.PI * (0.1 + index * 0.25);
      this.addShadowCaster(pilgrim);
    }

    const mary = this.visuals.createHumanoid({
      name: "mary02Visual",
      position: new Vector3(-2.7, 0, 4.35),
      tunicColor: new Color3(0.22, 0.34, 0.58),
      headCoverColor: new Color3(0.86, 0.79, 0.66),
      scale: 0.62,
      showBelt: false
    });
    mary.rotation.y = this.rotationToward(mary.position, new Vector3(0.55, 0, 5.62));
    this.addShadowCaster(mary);
    this.collisionBoxes.push(createCollisionBox("mary02Visual", mary.position, 0.24, 0.24, 0.08));
  }

  private createTempleTeachingScene() {
    const jesus = this.visuals.createHumanoid({
      name: "jesusTempleSacredNarrative",
      position: new Vector3(0.55, 0, 5.62),
      tunicColor: new Color3(0.88, 0.78, 0.58),
      headCoverColor: new Color3(0.84, 0.73, 0.56),
      scale: 0.48,
      showBelt: false
    });
    jesus.rotation.y = Math.PI;
    this.addSoftHalo(jesus, "jesusTempleSacredHalo");
    this.addShadowCaster(jesus);

    const teacherConfigs = [
      { position: new Vector3(3.8, 0, 4.6), color: new Color3(0.36, 0.27, 0.18), rotation: -Math.PI * 0.62 },
      { position: new Vector3(1.85, 0, 6.65), color: new Color3(0.28, 0.35, 0.42), rotation: Math.PI * 0.72 },
      { position: new Vector3(-0.95, 0, 6.8), color: new Color3(0.39, 0.3, 0.44), rotation: Math.PI * 0.2 }
    ];

    for (const [index, config] of teacherConfigs.entries()) {
      const teacher = this.visuals.createHumanoid({
        name: `templeTeacherGroup02${index}`,
        position: config.position,
        tunicColor: config.color,
        headCoverColor: new Color3(0.76, 0.68, 0.52),
        scale: index === 0 ? 0.68 : 0.62
      });
      teacher.rotation.y = config.rotation;
      this.addScrollToHands(teacher, `templeTeacherScroll02${index}`);
      this.addShadowCaster(teacher);
      this.collisionBoxes.push(createCollisionBox(teacher.name, new Vector3(config.position.x, 0, config.position.z), 0.26, 0.26, 0.06));
    }

    for (const [index, position] of [
      new Vector3(-0.2, 0.025, 4.75),
      new Vector3(1.45, 0.025, 4.98),
      new Vector3(2.6, 0.025, 5.85)
    ].entries()) {
      const mat = this.material(`teachingCourtMat${index}Material`, index % 2 === 0 ? new Color3(0.58, 0.36, 0.22) : new Color3(0.42, 0.28, 0.18));
      const matMesh = MeshBuilder.CreateBox(`teachingCourtMat${index}`, { width: 1.0, height: 0.04, depth: 0.58 }, this.scene);
      matMesh.position = position;
      matMesh.rotation.y = index * 0.45;
      matMesh.material = mat;
      this.addShadowReceiver(matMesh);
    }
  }

  private createWanderingCitizens() {
    const citizenConfigs = [
      {
        waypoints: [new Vector3(-1.8, 0, -8.8), new Vector3(-0.8, 0, -4.8), new Vector3(-1.4, 0, -1.1), new Vector3(-2.6, 0, -4.9)],
        color: new Color3(0.42, 0.31, 0.22),
        cover: new Color3(0.72, 0.65, 0.5),
        speed: 0.74
      },
      {
        waypoints: [new Vector3(2.0, 0, -8.4), new Vector3(1.4, 0, -4.0), new Vector3(2.25, 0, -0.9), new Vector3(3.2, 0, -4.8)],
        color: new Color3(0.25, 0.36, 0.42),
        cover: new Color3(0.76, 0.68, 0.53),
        speed: 0.82
      },
      {
        waypoints: [new Vector3(-3.25, 0, -8.9), new Vector3(-3.55, 0, -6.4), new Vector3(-2.85, 0, -3.7), new Vector3(-3.75, 0, -5.6)],
        color: new Color3(0.47, 0.25, 0.19),
        cover: new Color3(0.67, 0.58, 0.43),
        speed: 0.68
      },
      {
        waypoints: [new Vector3(3.35, 0, -8.7), new Vector3(3.7, 0, -6.1), new Vector3(2.95, 0, -3.6), new Vector3(3.95, 0, -5.4)],
        color: new Color3(0.32, 0.43, 0.26),
        cover: new Color3(0.78, 0.68, 0.48),
        speed: 0.72
      },
      {
        waypoints: [new Vector3(-5.65, 0, 1.1), new Vector3(-5.65, 0, 3.6), new Vector3(-6.05, 0, 6.45), new Vector3(-7.2, 0, 4.2)],
        color: new Color3(0.34, 0.28, 0.46),
        cover: new Color3(0.72, 0.62, 0.47),
        speed: 0.64
      },
      {
        waypoints: [new Vector3(5.7, 0, 1.1), new Vector3(5.7, 0, 3.65), new Vector3(6.05, 0, 6.45), new Vector3(7.35, 0, 4.25)],
        color: new Color3(0.5, 0.33, 0.18),
        cover: new Color3(0.76, 0.7, 0.55),
        speed: 0.66
      },
      {
        waypoints: [new Vector3(-3.0, 0, 1.05), new Vector3(-3.0, 0, 3.35), new Vector3(-3.15, 0, 6.85), new Vector3(-2.35, 0, 4.15)],
        color: new Color3(0.24, 0.38, 0.34),
        cover: new Color3(0.68, 0.6, 0.45),
        speed: 0.58
      },
      {
        waypoints: [new Vector3(3.0, 0, 1.05), new Vector3(3.0, 0, 3.35), new Vector3(2.8, 0, 7.05), new Vector3(2.15, 0, 4.1)],
        color: new Color3(0.45, 0.24, 0.35),
        cover: new Color3(0.74, 0.64, 0.5),
        speed: 0.6
      }
    ];

    for (const [index, config] of citizenConfigs.entries()) {
      const start = config.waypoints[index % config.waypoints.length].clone();
      const citizen = this.visuals.createHumanoid({
        name: `jerusalemWanderingCitizen${index}`,
        position: start,
        tunicColor: config.color,
        headCoverColor: config.cover,
        scale: 0.54 + (index % 3) * 0.04
      });
      citizen.rotation.y = this.rotationToward(start, config.waypoints[(index + 1) % config.waypoints.length]);
      this.addShadowCaster(citizen);
      this.wanderingCitizens.push({
        node: citizen,
        waypoints: config.waypoints,
        waypointIndex: (index + 1) % config.waypoints.length,
        speed: config.speed,
        pauseSeconds: (index % 4) * 0.2,
        walkTime: index,
        animationParts: citizen.metadata?.humanoidParts as HumanoidAnimationParts | undefined
      });
    }
  }

  private updateWanderingCitizens(deltaSeconds: number) {
    for (const citizen of this.wanderingCitizens) {
      if (citizen.pauseSeconds > 0) {
        citizen.pauseSeconds = Math.max(0, citizen.pauseSeconds - deltaSeconds);
        this.animateWanderingCitizen(citizen, deltaSeconds, false);
        continue;
      }

      const target = citizen.waypoints[citizen.waypointIndex];
      const toTarget = target.subtract(citizen.node.position);
      toTarget.y = 0;
      const distance = toTarget.length();

      if (distance < 0.08) {
        citizen.waypointIndex = (citizen.waypointIndex + 1) % citizen.waypoints.length;
        citizen.pauseSeconds = 0.35 + (citizen.waypointIndex % 3) * 0.18;
        this.animateWanderingCitizen(citizen, deltaSeconds, false);
        continue;
      }

      const direction = this.getWanderingCitizenDirection(citizen, toTarget.normalize());
      const step = Math.min(distance, citizen.speed * deltaSeconds);
      citizen.node.rotation.y = Math.atan2(direction.x, direction.z);
      const nextPosition = citizen.node.position.add(direction.scale(step));
      if (this.canWanderingCitizenOccupy(nextPosition)) {
        citizen.node.position.copyFrom(nextPosition);
        this.animateWanderingCitizen(citizen, deltaSeconds, true);
      } else {
        citizen.waypointIndex = (citizen.waypointIndex + 1) % citizen.waypoints.length;
        citizen.pauseSeconds = 0.22;
        this.animateWanderingCitizen(citizen, deltaSeconds, false);
      }
    }
  }

  private getWanderingCitizenDirection(citizen: WanderingCitizen, desiredDirection: Vector3) {
    const direction = desiredDirection.clone();
    for (const other of this.wanderingCitizens) {
      if (other === citizen) continue;
      const away = citizen.node.position.subtract(other.node.position);
      away.y = 0;
      const distance = away.length();
      if (distance <= 0.001 || distance > 0.72) continue;
      direction.addInPlace(away.normalize().scale((0.72 - distance) * 1.35));
    }

    if (direction.lengthSquared() <= 0.001) {
      return desiredDirection;
    }
    return direction.normalize();
  }

  private canWanderingCitizenOccupy(position: Vector3) {
    const radius = 0.18;
    if (
      position.x < this.movementBounds.minX ||
      position.x > this.movementBounds.maxX ||
      position.z < this.movementBounds.minZ ||
      position.z > this.movementBounds.maxZ
    ) {
      return false;
    }

    return !this.collisionBoxes.some(
      (box) =>
        position.x + radius > box.minX &&
        position.x - radius < box.maxX &&
        position.z + radius > box.minZ &&
        position.z - radius < box.maxZ
    );
  }

  private animateWanderingCitizen(
    citizen: WanderingCitizen,
    deltaSeconds: number,
    isWalking: boolean
  ) {
    const parts = citizen.animationParts;
    if (!parts) return;

    if (isWalking) {
      citizen.walkTime += deltaSeconds * 7.2;
    }

    const swing = isWalking ? Math.sin(citizen.walkTime) * 0.36 : 0;
    const returnSpeed = isWalking ? 1 : Math.min(1, deltaSeconds * 7);
    parts.leftArm.rotation.x = this.lerp(parts.leftArm.rotation.x, swing, returnSpeed);
    parts.rightArm.rotation.x = this.lerp(parts.rightArm.rotation.x, -swing, returnSpeed);
    parts.leftLeg.rotation.x = this.lerp(parts.leftLeg.rotation.x, -swing * 0.72, returnSpeed);
    parts.rightLeg.rotation.x = this.lerp(parts.rightLeg.rotation.x, swing * 0.72, returnSpeed);
  }

  private createMarkers() {
    const markerConfigs: MarkerConfig[] = [
      {
        id: "pilgrim_elder_02",
        label: "Offer help",
        type: "npc",
        targetId: "pilgrim_elder_02",
        position: new Vector3(-5.4, 0, -2.2),
        color: new Color3(0.55, 0.82, 1)
      },
      {
        id: "water_skin",
        label: "Collect the water skin",
        type: "item",
        targetId: "water_skin",
        position: new Vector3(-7.1, 0.55, -6.5),
        color: new Color3(1, 0.9, 0.3)
      },
      {
        id: "temple_gate",
        label: "Bring water to the gate",
        type: "location",
        targetId: "temple_gate",
        itemId: "water_skin",
        position: new Vector3(0, 0, 1.35),
        color: new Color3(0.75, 1, 0.58)
      },
      {
        id: "temple_teacher_02",
        label: "Ask about the teaching",
        type: "npc",
        targetId: "temple_teacher_02",
        position: new Vector3(3.8, 0, 4.6),
        color: new Color3(0.55, 0.82, 1)
      },
      {
        id: "teaching_court",
        label: "Observe the teaching court",
        type: "observe",
        targetId: "teaching_court",
        position: new Vector3(0.4, 0, 5.55),
        color: new Color3(0.95, 0.75, 1)
      },
      {
        id: "mary_02",
        label: "Speak with Mary",
        type: "npc",
        targetId: "mary_02",
        position: new Vector3(-2.7, 0, 4.35),
        color: new Color3(0.55, 0.82, 1)
      },
      {
        id: "fathers_house_scene",
        label: "Witness with reverence",
        type: "observe",
        targetId: "fathers_house_scene",
        position: new Vector3(0.55, 0, 5.62),
        color: new Color3(1, 0.84, 0.34)
      }
    ];

    for (const config of markerConfigs) {
      const node = this.createMarkerNode(config);
      this.markers.push({
        node,
        interaction: {
          id: config.id,
          label: config.label,
          type: config.type,
          targetId: config.targetId,
          itemId: config.itemId
        }
      });
    }

    this.updateMarkerVisibility();
  }

  private createMarkerNode(config: MarkerConfig) {
    const root = new TransformNode(`${config.id}Marker`, this.scene);
    root.position = config.position.clone();
    root.metadata = { ...(root.metadata ?? {}), baseY: root.position.y };

    if (config.type === "item") {
      const waterSkin = this.createWaterSkin("waterSkinCollectible", new Vector3(0, 0, 0));
      waterSkin.parent = root;
      const ring = this.visuals.createInteractionRing(
        `${config.id}GroundRing`,
        Vector3.Zero(),
        new Color3(1, 0.86, 0.22),
        0.95
      );
      ring.parent = root;
      return root;
    }

    const ring = this.visuals.createInteractionRing(`${config.id}Ring`, new Vector3(0, 0, 0), config.color, config.type === "observe" ? 1.35 : 1.1);
    ring.parent = root;
    return root;
  }

  private updateMarkerVisibility() {
    for (const marker of this.markers) {
      const isVisible = this.isInteractionVisible(marker.interaction);
      if (marker.interaction.type === "npc" || marker.interaction.type === "item") {
        marker.node.setEnabled(!this.isCollectedItemInteraction(marker.interaction));
        this.setInteractionRingEnabled(marker.node, isVisible);
      } else {
        marker.node.setEnabled(isVisible);
      }
    }
  }

  private animateMarkers() {
    const pulse = 1 + Math.sin(this.markerPulseTime * 4.2) * 0.08;
    for (const marker of this.markers) {
      if (!marker.node.isEnabled()) continue;
      for (const ring of this.getInteractionRings(marker.node)) {
        const baseScale = Number(ring.metadata?.baseScale ?? 1);
        ring.scaling.setAll(baseScale * pulse);
      }
    }
  }

  private updateNearestInteraction() {
    const playerPosition = this.player.getPosition();
    let nearest: SceneInteraction | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const marker of this.markers) {
      if (!this.isInteractionVisible(marker.interaction)) continue;
      const distance = Vector3.Distance(playerPosition, marker.node.position);
      if (distance < 1.65 && distance < nearestDistance) {
        nearest = marker.interaction;
        nearestDistance = distance;
      }
    }

    if (nearest?.id !== this.nearest?.id) {
      this.nearest = nearest;
      this.callbacks.onNearestInteractionChange(nearest);
    }
  }

  private updateObjectiveHint() {
    const playerPosition = this.player.getPosition();
    let objective: SceneMarker | null = null;
    let objectiveDistance = Number.POSITIVE_INFINITY;

    for (const marker of this.markers) {
      if (!this.isInteractionVisible(marker.interaction)) continue;
      const distance = Vector3.Distance(playerPosition, marker.node.position);
      if (distance < objectiveDistance) {
        objective = marker;
        objectiveDistance = distance;
      }
    }

    if (!objective) {
      this.setObjectiveHint(null);
      return;
    }

    const direction = objective.node.position.subtract(playerPosition);
    direction.y = 0;
    if (direction.lengthSquared() === 0) {
      this.setObjectiveHint(null);
      return;
    }
    direction.normalize();

    const { forward, right } = this.player.getCameraBasis();
    this.setObjectiveHint({
      label: objective.interaction.label,
      distance: objectiveDistance,
      angleRadians: Math.atan2(Vector3.Dot(direction, right), Vector3.Dot(direction, forward))
    });
  }

  private setObjectiveHint(hint: ObjectiveHint | null) {
    const previous = this.objectiveHint;
    const changed =
      previous?.label !== hint?.label ||
      Math.abs((previous?.distance ?? 0) - (hint?.distance ?? 0)) > 0.08 ||
      Math.abs((previous?.angleRadians ?? 0) - (hint?.angleRadians ?? 0)) > 0.04;
    if (!changed) return;

    this.objectiveHint = hint;
    this.callbacks.onObjectiveHintChange(hint);
  }

  private isInteractionVisible(interaction: SceneInteraction) {
    if (this.isCollectedItemInteraction(interaction)) return false;
    return this.isInteractionActive(interaction);
  }

  private isInteractionActive(interaction: SceneInteraction) {
    return (
      this.activeInteractionIds.has(`${interaction.type}:${interaction.targetId}`) ||
      this.activeInteractionIds.has(`give_item:${interaction.targetId}:${interaction.itemId ?? ""}`)
    );
  }

  private isCollectedItemInteraction(interaction: SceneInteraction) {
    return interaction.type === "item" && this.collectedItemIds.has(interaction.targetId);
  }

  private setInteractionRingEnabled(node: TransformNode, enabled: boolean) {
    for (const ring of this.getInteractionRings(node)) {
      ring.setEnabled(enabled);
    }
  }

  private getInteractionRings(node: TransformNode) {
    const rings = node.getChildMeshes(false).filter((mesh) => this.isInteractionRing(mesh));
    if (this.isInteractionRing(node)) {
      return [node, ...rings];
    }
    return rings;
  }

  private isInteractionRing(node: TransformNode) {
    return Boolean(node.metadata?.isInteractionRing) || node.name.toLowerCase().includes("ring");
  }

  private createWaterSkin(name: string, position: Vector3) {
    const root = new TransformNode(name, this.scene);
    root.position = position.clone();
    const leather = this.material(`${name}Leather`, new Color3(0.42, 0.24, 0.12));
    const cord = this.material(`${name}Cord`, new Color3(0.18, 0.11, 0.06));

    const body = MeshBuilder.CreateSphere(`${name}Body`, { diameter: 0.58, segments: 10 }, this.scene);
    body.position = new Vector3(0, 0.34, 0);
    body.scaling = new Vector3(0.74, 1, 0.42);
    body.material = leather;
    body.parent = root;

    const neck = MeshBuilder.CreateCylinder(`${name}Neck`, { height: 0.22, diameter: 0.16, tessellation: 8 }, this.scene);
    neck.position = new Vector3(0, 0.72, 0);
    neck.material = leather;
    neck.parent = root;

    const strap = MeshBuilder.CreateTorus(`${name}Strap`, { diameter: 0.62, thickness: 0.025, tessellation: 16 }, this.scene);
    strap.position = new Vector3(0, 0.48, 0);
    strap.rotation.x = Math.PI / 2;
    strap.scaling.x = 0.7;
    strap.material = cord;
    strap.parent = root;

    return root;
  }

  private addWalkingStaff(parent: TransformNode, name: string) {
    const staff = MeshBuilder.CreateCylinder(name, { height: 1.28, diameter: 0.045, tessellation: 6 }, this.scene);
    staff.position = new Vector3(0.42, 0.73, 0.08);
    staff.rotation.z = -0.14;
    staff.material = this.material(`${name}Material`, new Color3(0.22, 0.13, 0.07));
    staff.parent = parent;
  }

  private addScrollToHands(parent: TransformNode, name: string) {
    const parts = parent.metadata?.humanoidParts as HumanoidAnimationParts | undefined;
    if (parts) {
      parts.leftArm.position = new Vector3(-0.34, 0.86, 0.24);
      parts.rightArm.position = new Vector3(0.34, 0.86, 0.24);
      parts.leftArm.rotation.x = Math.PI / 2;
      parts.rightArm.rotation.x = Math.PI / 2;
      parts.leftArm.rotation.z = 0.18;
      parts.rightArm.rotation.z = -0.18;
    }

    const scroll = MeshBuilder.CreateCylinder(name, { height: 0.72, diameter: 0.08, tessellation: 8 }, this.scene);
    scroll.position = new Vector3(0, 0.86, 0.42);
    scroll.rotation.z = Math.PI / 2;
    scroll.material = this.material(`${name}Material`, new Color3(0.86, 0.78, 0.56));
    scroll.parent = parent;

    const handMaterial = this.material(`${name}HandMaterial`, new Color3(0.62, 0.42, 0.27));
    for (const x of [-0.31, 0.31]) {
      const hand = MeshBuilder.CreateSphere(
        `${name}Grip${x}`,
        { diameter: 0.12, segments: 8 },
        this.scene
      );
      hand.position = new Vector3(x, 0.86, 0.42);
      hand.material = handMaterial;
      hand.parent = parent;
    }
  }

  private addSoftHalo(parent: TransformNode, name: string) {
    const material = this.material(`${name}Material`, new Color3(1, 0.84, 0.32));
    material.emissiveColor = new Color3(1, 0.68, 0.12);
    material.alpha = 0.72;
    const halo = MeshBuilder.CreateTorus(name, { diameter: 0.44, thickness: 0.018, tessellation: 24 }, this.scene);
    halo.position = new Vector3(0, 1.64, 0);
    halo.material = material;
    halo.parent = parent;
  }

  private rotationToward(from: Vector3, to: Vector3) {
    return Math.atan2(to.x - from.x, to.z - from.z);
  }

  private lerp(from: number, to: number, amount: number) {
    return from + (to - from) * amount;
  }

  private material(name: string, color: Color3) {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = color;
    material.specularColor = Color3.Black();
    return material;
  }

  private addShadowReceiver(mesh: Mesh) {
    mesh.receiveShadows = true;
  }

  private addShadowCaster(node: TransformNode) {
    if (!this.shadowGenerator) return;
    const meshes = node instanceof Mesh ? [node, ...node.getChildMeshes(false)] : node.getChildMeshes(false);
    for (const mesh of meshes) {
      if (mesh.metadata?.isInteractionRing || mesh.metadata?.isItemMarker || mesh.metadata?.isPlayerOcclusionOverlay) continue;
      this.shadowGenerator.addShadowCaster(mesh);
    }
  }
}
