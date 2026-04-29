import {
  Color3,
  Color4,
  DirectionalLight,
  DynamicTexture,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  TransformNode,
  Vector3
} from "@babylonjs/core";
import { CascadedShadowGenerator } from "@babylonjs/core/Lights/Shadows/cascadedShadowGenerator";
import type { InputManager } from "../engine/InputManager";
import {
  createCollisionBox,
  type CollisionBox,
  type MovementBounds
} from "../physics/CollisionTypes";
import { PlayerController } from "../player/PlayerController";
import { LowPolyFactory } from "../visuals/LowPolyFactory";
import type { BuildingVisual, HumanoidAnimationParts } from "../visuals/LowPolyFactory";
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
  interiorZoneId?: string;
  position: Vector3;
  color: Color3;
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
};

type InteriorObjectiveMarker = {
  zoneId: string;
  node: TransformNode;
};

type GuidedCompanion = {
  node: TransformNode;
  start: Vector3;
  destination: Vector3;
  waypoints: Vector3[];
  path: Vector3[];
  waypointIndex: number;
  speed: number;
  walkTime: number;
  animationParts?: HumanoidAnimationParts;
};

const GUIDING_STAR_START = new Vector3(0, 0, 9);
const GUIDING_STAR_END = new Vector3(6.1, 0, -5.85);
const GUIDING_STAR_PATH = [
  GUIDING_STAR_START,
  new Vector3(0.55, 0, 4.6),
  new Vector3(0.2, 0, -0.7),
  new Vector3(1.55, 0, -4.2),
  new Vector3(4.2, 0, -7.95),
  new Vector3(6.1, 0, -7.95),
  GUIDING_STAR_END
];

export class BethlehemScene implements ChapterScene {
  scene: Scene;
  private player: PlayerController;
  private markers: Array<{ node: TransformNode; interaction: SceneInteraction }> = [];
  private nearest: SceneInteraction | null = null;
  private objectiveHint: ObjectiveHint | null = null;
  private activeInteractionIds = new Set<string>();
  private collectedItemIds = new Set<string>();
  private worldStateIds = new Set<string>();
  private collisionBoxes: CollisionBox[] = [];
  private interiorZones: InteriorZone[] = [];
  private interiorObjectiveMarkers: InteriorObjectiveMarker[] = [];
  private preparedStableBlanket: TransformNode | null = null;
  private nativityGroup: TransformNode | null = null;
  private infantJesusGroup: TransformNode | null = null;
  private infantHalo: TransformNode | null = null;
  private guidingStarRoot: TransformNode | null = null;
  private guidingStarGroundLight: TransformNode | null = null;
  private guidingStarProgress = 0;
  private guidedCompanions: GuidedCompanion[] = [];
  private shadowGenerator: ShadowGenerator | null = null;
  private visuals: LowPolyFactory;
  private markerPulseTime = 0;
  private movementBounds: MovementBounds = {
    minX: -13,
    maxX: 13,
    minZ: -13,
    maxZ: 13
  };

  constructor(
    scene: Scene,
    private input: InputManager,
    private callbacks: ChapterSceneCallbacks
  ) {
    this.scene = scene;
    this.visuals = new LowPolyFactory(scene);
    this.scene.clearColor = new Color4(0.91, 0.78, 0.55, 1);
    this.createLighting();
    this.createEnvironment();
    this.createMarkers();
    this.createGuidedCompanionPaths();
    this.player = new PlayerController(scene, input);
    this.player.setCollision(this.collisionBoxes, this.movementBounds);
    this.player.addToShadowGenerator(this.getShadowGenerator());
  }

  update(deltaSeconds: number) {
    this.player.update(deltaSeconds);
    this.updateBuildingRoofs(deltaSeconds);
    this.updateMarkerVisibility();
    this.animateInteractionMarks(deltaSeconds);
    this.animateInfantHalo(deltaSeconds);
    this.animateGuidingStarAndCompanions(deltaSeconds);
    this.updateNearestInteraction();
  }

  interact() {
    return this.nearest;
  }

  setActiveInteractionIds(ids: string[]) {
    this.activeInteractionIds = new Set(ids);
    this.updateMarkerVisibility();
    this.updateNearestInteraction();
  }

  setCollectedItemIds(ids: string[]) {
    this.collectedItemIds = new Set(ids);
    this.updateMarkerVisibility();
    this.updateNearestInteraction();
  }

  setWorldStateIds(ids: string[]) {
    this.worldStateIds = new Set(ids);
    this.updateWorldStateVisuals();
  }

  getPlayerPosition() {
    return this.player.getPosition();
  }

  dispose() {
    this.player.dispose();
    this.scene.dispose();
  }

  private createLighting() {
    const hemi = new HemisphericLight("bethlehemSkyLight", new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.62;
    hemi.diffuse = new Color3(1, 0.86, 0.62);

    const sun = new DirectionalLight("bethlehemSun", new Vector3(-0.6, -1, 0.3), this.scene);
    sun.position = new Vector3(12, 22, -12);
    sun.intensity = 1.15;
    sun.diffuse = new Color3(1, 0.78, 0.42);
    sun.shadowMinZ = 0.1;
    sun.shadowMaxZ = 90;

    const shadowGenerator = new CascadedShadowGenerator(2048, sun);
    shadowGenerator.numCascades = 4;
    shadowGenerator.shadowMaxZ = 90;
    shadowGenerator.setMinMaxDistance(0.1, 90);
    shadowGenerator.stabilizeCascades = true;
    shadowGenerator.lambda = 0.72;
    shadowGenerator.cascadeBlendPercentage = 0.18;
    shadowGenerator.darkness = 0.52;
    this.shadowGenerator = shadowGenerator;
  }

  private getShadowGenerator() {
    if (!this.shadowGenerator) {
      throw new Error("Shadow generator has not been initialized.");
    }
    return this.shadowGenerator;
  }

  private addShadowReceiver(mesh: Mesh) {
    mesh.receiveShadows = true;
  }

  private addShadowReceivers(node: TransformNode) {
    const meshes = node instanceof Mesh ? [node, ...node.getChildMeshes(false)] : node.getChildMeshes(false);
    for (const mesh of meshes) {
      mesh.receiveShadows = true;
    }
  }

  private addShadowCaster(node: TransformNode) {
    const shadowGenerator = this.getShadowGenerator();
    const meshes = node instanceof Mesh ? [node, ...node.getChildMeshes(false)] : node.getChildMeshes(false);
    for (const mesh of meshes) {
      if (this.isInteractionRing(mesh) || this.isItemMarker(mesh) || mesh.metadata?.isPlayerOcclusionOverlay) continue;
      shadowGenerator.addShadowCaster(mesh);
    }
  }

  private createEnvironment() {
    const ground = MeshBuilder.CreateGround("bethlehemGround", { width: 30, height: 30 }, this.scene);
    const groundMaterial = new StandardMaterial("sandMaterial", this.scene);
    groundMaterial.diffuseColor = new Color3(0.71, 0.55, 0.34);
    ground.material = groundMaterial;
    this.addShadowReceiver(ground);

    this.createVillageRoad();

    this.createBuilding("inn", new Vector3(-5.2, 0, 1.2), new Vector3(5.2, 1.8, 4.1), new Color3(0.63, 0.48, 0.33));
    this.createBuilding("home", new Vector3(3.7, 0, 2.2), new Vector3(4.3, 1.55, 3.5), new Color3(0.72, 0.59, 0.42));
    this.createBuilding("stable", new Vector3(5.9, 0, -5.7), new Vector3(4.7, 1.25, 3.2), new Color3(0.42, 0.31, 0.19));
    this.createBuilding("market", new Vector3(-6.2, 0, -5.7), new Vector3(4.8, 1.35, 3.3), new Color3(0.68, 0.53, 0.37));
    this.createSign("Inn", new Vector3(-5.2, 1.52, -0.96), 1.45);
    this.createSign("Home", new Vector3(3.7, 1.34, 0.34), 1.25);
    this.createSign("Stable", new Vector3(5.9, 1.22, -7.41), 1.45);
    this.createSign("Market", new Vector3(-6.2, 1.34, -7.46), 1.55);

    for (const position of [
      new Vector3(-1, 0, -3),
      new Vector3(1.2, 0, -2.5),
      new Vector3(-2.5, 0, 4.5)
    ]) {
      const jar = MeshBuilder.CreateCylinder("clayJar", { height: 0.7, diameterTop: 0.35, diameterBottom: 0.55 }, this.scene);
      jar.position = new Vector3(position.x, 0.35, position.z);
      const material = new StandardMaterial("jarMaterial", this.scene);
      material.diffuseColor = new Color3(0.55, 0.29, 0.15);
      jar.material = material;
      this.addShadowCaster(jar);
      this.collisionBoxes.push(createCollisionBox(jar.name, position, 0.12, 0.12, 0.02));
    }

    this.addShadowCaster(this.visuals.createCrate("marketCrate01", new Vector3(-4.1, 0, -6.8)));
    this.addShadowCaster(this.visuals.createCrate("marketCrate02", new Vector3(-7.7, 0, -4.2)));
    this.addShadowCaster(this.visuals.createFence("stableFenceLeft", new Vector3(3.35, 0, -8.05), 3, 0.55));
    this.addShadowCaster(this.visuals.createFence("stableFenceRight", new Vector3(7.35, 0, -8.05), 3, 0.55));
    this.collisionBoxes.push(createCollisionBox("marketCrate01", new Vector3(-4.1, 0, -6.8), 0.24, 0.24, 0.04));
    this.collisionBoxes.push(createCollisionBox("marketCrate02", new Vector3(-7.7, 0, -4.2), 0.24, 0.24, 0.04));
    this.createShepherdCamp();
    this.createMagiCaravan();
    this.createVillageDecor();
    this.createWorldStateVisuals();
  }

  private createVillageRoad() {
    const roadMaterial = new StandardMaterial("roadMaterial", this.scene);
    roadMaterial.diffuseColor = new Color3(0.79, 0.66, 0.45);
    const edgeMaterial = new StandardMaterial("roadEdgeMaterial", this.scene);
    edgeMaterial.diffuseColor = new Color3(0.63, 0.5, 0.34);

    const segments = [
      { position: new Vector3(-1.3, 0.012, -10.7), width: 4.5, height: 5.5, rotation: Math.PI / 10 },
      { position: new Vector3(-0.65, 0.013, -5.4), width: 4.2, height: 5.8, rotation: Math.PI / 12 },
      { position: new Vector3(0, 0.014, 0.1), width: 4.55, height: 5.7, rotation: Math.PI / 10 },
      { position: new Vector3(0.85, 0.015, 5.5), width: 4.15, height: 5.6, rotation: Math.PI / 8 },
      { position: new Vector3(1.25, 0.016, 10.7), width: 4.45, height: 5.4, rotation: Math.PI / 11 }
    ];

    for (const [index, segment] of segments.entries()) {
      const road = MeshBuilder.CreateGround(
        `mainRoadSegment${index}`,
        { width: segment.width, height: segment.height },
        this.scene
      );
      road.position = segment.position;
      road.rotation.y = segment.rotation;
      road.material = roadMaterial;
      this.addShadowReceiver(road);

      for (const side of [-1, 1]) {
        const edge = MeshBuilder.CreateGround(
          `mainRoadEdge${index}${side}`,
          { width: 0.16, height: segment.height * 0.94 },
          this.scene
        );
        const lateral = new Vector3(Math.cos(segment.rotation), 0, -Math.sin(segment.rotation)).scale(
          side * segment.width * 0.52
        );
        edge.position = segment.position.add(lateral);
        edge.position.y += 0.004;
        edge.rotation.y = segment.rotation;
        edge.material = edgeMaterial;
        this.addShadowReceiver(edge);
      }
    }
  }

  private createVillageDecor() {
    const treePlacements = [
      { type: "olive", position: new Vector3(-10.2, 0, 6.9), scale: 1.12 },
      { type: "olive", position: new Vector3(12.4, 0, 6.6), scale: 0.82 },
      { type: "olive", position: new Vector3(-9.4, 0, -1.4), scale: 0.82 },
      { type: "olive", position: new Vector3(-11.6, 0, 8.6), scale: 0.88 },
      { type: "olive", position: new Vector3(-8.5, 0, 9.5), scale: 0.78 },
      { type: "olive", position: new Vector3(8.1, 0, 8.7), scale: 1.05 },
      { type: "olive", position: new Vector3(11.5, 0, 7.8), scale: 0.9 },
      { type: "olive", position: new Vector3(-12.1, 0, 3.7), scale: 0.74 },
      { type: "olive", position: new Vector3(11.6, 0, 2.3), scale: 0.82 },
      { type: "olive", position: new Vector3(-10.7, 0, -3.6), scale: 0.98 },
      { type: "olive", position: new Vector3(9.2, 0, -4.1), scale: 0.76 },
      { type: "olive", position: new Vector3(-7.9, 0, -10.4), scale: 0.88 },
      { type: "olive", position: new Vector3(7.6, 0, -10.2), scale: 0.86 },
      { type: "olive", position: new Vector3(-12.2, 0, 11.4), scale: 0.72 },
      { type: "olive", position: new Vector3(-9.8, 0, 11.7), scale: 0.84 },
      { type: "olive", position: new Vector3(-6.7, 0, 11.0), scale: 0.7 },
      { type: "olive", position: new Vector3(6.5, 0, 11.2), scale: 0.78 },
      { type: "olive", position: new Vector3(9.6, 0, 11.4), scale: 0.88 },
      { type: "olive", position: new Vector3(12.0, 0, 10.3), scale: 0.74 },
      { type: "olive", position: new Vector3(-12.3, 0, -0.4), scale: 0.72 },
      { type: "olive", position: new Vector3(-11.7, 0, -6.2), scale: 0.86 },
      { type: "olive", position: new Vector3(12.2, 0, -0.8), scale: 0.76 },
      { type: "olive", position: new Vector3(11.7, 0, -5.8), scale: 0.84 },
      { type: "olive", position: new Vector3(-5.1, 0, -11.8), scale: 0.7 },
      { type: "olive", position: new Vector3(-1.4, 0, -12.2), scale: 0.78 },
      { type: "olive", position: new Vector3(2.6, 0, -12.0), scale: 0.74 },
      { type: "olive", position: new Vector3(5.5, 0, -11.9), scale: 0.82 },
      { type: "palm", position: new Vector3(10.6, 0, -8.2), scale: 1.05 },
      { type: "palm", position: new Vector3(-11.1, 0, -8.8), scale: 0.9 },
      { type: "palm", position: new Vector3(11.8, 0, -10.7), scale: 0.82 },
      { type: "palm", position: new Vector3(-12.0, 0, -11.1), scale: 0.78 },
      { type: "palm", position: new Vector3(12.3, 0, 4.8), scale: 0.72 },
      { type: "palm", position: new Vector3(-12.4, 0, 5.9), scale: 0.76 }
    ];

    for (const [index, placement] of treePlacements.entries()) {
      if (placement.type === "palm") {
        this.addShadowCaster(
          this.visuals.createPalmTree(`villagePalm${index}`, placement.position, placement.scale)
        );
      } else {
        this.addShadowCaster(
          this.visuals.createOliveTree(`villageOlive${index}`, placement.position, placement.scale)
        );
      }
      this.collisionBoxes.push(
        createCollisionBox(`treeCollision${index}`, placement.position, 0.32 * placement.scale, 0.32 * placement.scale, 0.08)
      );
    }

    const rocks = [
      new Vector3(-8.4, 0, 8.9),
      new Vector3(8.3, 0, 1.1),
      new Vector3(2.4, 0, -9.2),
      new Vector3(-3.7, 0, -10.1),
      new Vector3(11.3, 0, -1.8)
    ];
    for (const [index, position] of rocks.entries()) {
      const scale = 0.65 + (index % 3) * 0.18;
      this.addShadowCaster(this.visuals.createRock(`villageRock${index}`, position, scale));
      this.collisionBoxes.push(createCollisionBox(`rockCollision${index}`, position, 0.18 * scale, 0.16 * scale, 0.04));
    }

    const scrubPositions = [
      new Vector3(-8.8, 0, 4.6),
      new Vector3(7.8, 0, -8.8),
      new Vector3(9.5, 0, 8.5),
      new Vector3(-11.2, 0, 1.2),
      new Vector3(4.4, 0, 9.7),
      new Vector3(-2.2, 0, -8.5),
      new Vector3(-12.0, 0, 9.8),
      new Vector3(-8.0, 0, 12.0),
      new Vector3(-4.2, 0, 11.5),
      new Vector3(4.6, 0, 11.7),
      new Vector3(8.2, 0, 12.0),
      new Vector3(12.1, 0, 8.4),
      new Vector3(-12.4, 0, -3.8),
      new Vector3(-10.5, 0, -6.8),
      new Vector3(-6.5, 0, -12.0),
      new Vector3(-3.0, 0, -11.7),
      new Vector3(1.1, 0, -11.4),
      new Vector3(4.7, 0, -12.1),
      new Vector3(8.5, 0, -11.6),
      new Vector3(12.0, 0, -7.3),
      new Vector3(12.4, 0, -3.6),
      new Vector3(10.7, 0, 0.9),
      new Vector3(-10.3, 0, 3.8),
      new Vector3(6.9, 0, 7.8)
    ];
    for (const [index, position] of scrubPositions.entries()) {
      this.addShadowCaster(this.visuals.createScrub(`villageScrub${index}`, position, 0.8 + (index % 2) * 0.22));
    }

    const pebblePositions = [
      new Vector3(-2.8, 0, -6.5),
      new Vector3(2.3, 0, -4.4),
      new Vector3(-2.6, 0, -0.7),
      new Vector3(2.7, 0, 1.8),
      new Vector3(-1.7, 0, 5.2),
      new Vector3(3.4, 0, 7.4),
      new Vector3(-6.2, 0, 7.6),
      new Vector3(6.9, 0, -2.8)
    ];
    for (const [index, position] of pebblePositions.entries()) {
      this.addShadowCaster(this.visuals.createPebbleCluster(`villagePebbles${index}`, position, 4 + (index % 3)));
    }

    this.createDenseDecorScatter();
  }

  private createDenseDecorScatter() {
    let treeIndex = 0;
    let scrubIndex = 0;
    let pebbleIndex = 0;
    let rockIndex = 0;

    for (let x = -12; x <= 12; x += 1.45) {
      for (let z = -12; z <= 12; z += 1.35) {
        const jitterX = Math.sin(x * 2.17 + z * 0.73) * 0.34;
        const jitterZ = Math.cos(z * 1.91 - x * 0.61) * 0.31;
        const position = new Vector3(x + jitterX, 0, z + jitterZ);
        if (this.isDecorReserved(position)) continue;

        const noise = this.decorNoise(position.x, position.z);
        if (noise > 0.82) {
          const isPalm = noise > 0.94;
          const scale = 0.48 + this.decorNoise(position.z, position.x) * 0.34;
          if (isPalm) {
            this.addShadowCaster(this.visuals.createPalmTree(`densePalm${treeIndex}`, position, scale));
          } else {
            this.addShadowCaster(this.visuals.createOliveTree(`denseOlive${treeIndex}`, position, scale));
          }
          treeIndex += 1;
          continue;
        }

        if (noise > 0.5) {
          this.addShadowCaster(
            this.visuals.createScrub(
              `denseScrub${scrubIndex}`,
              position,
              0.46 + this.decorNoise(position.x + 3.1, position.z - 1.7) * 0.42
            )
          );
          scrubIndex += 1;
        } else if (noise > 0.28) {
          this.addShadowCaster(
            this.visuals.createPebbleCluster(
              `densePebbles${pebbleIndex}`,
              position,
              3 + Math.floor(this.decorNoise(position.z + 2.2, position.x) * 4)
            )
          );
          pebbleIndex += 1;
        } else if (noise > 0.18) {
          this.addShadowCaster(
            this.visuals.createRock(
              `denseRock${rockIndex}`,
              position,
              0.28 + this.decorNoise(position.x - 4.6, position.z + 5.2) * 0.24
            )
          );
          rockIndex += 1;
        }
      }
    }
  }

  private createShepherdCamp() {
    const shepherds = [
      { position: new Vector3(-1.85, 0, 5.05), rotation: Math.PI * 0.12, color: new Color3(0.44, 0.34, 0.2) },
      { position: new Vector3(-0.2, 0, 6.05), rotation: -Math.PI * 0.2, color: new Color3(0.5, 0.28, 0.18) },
      { position: new Vector3(-1.65, 0, 6.48), rotation: Math.PI * 0.65, color: new Color3(0.34, 0.42, 0.28) }
    ];

    for (const [index, shepherd] of shepherds.entries()) {
      const person = this.visuals.createHumanoid({
        name: `shepherdCompanion${index}`,
        position: shepherd.position,
        tunicColor: shepherd.color,
        headCoverColor: new Color3(0.76, 0.68, 0.52),
        scale: 0.66
      });
      person.rotation.y = shepherd.rotation;
      this.addShepherdStaff(person, `shepherdCompanion${index}Staff`);
      this.guidedCompanions.push({
        node: person,
        start: shepherd.position.clone(),
        destination: new Vector3(4.6 + index * 0.5, 0, -8.42),
        waypoints: [],
        path: [],
        waypointIndex: 0,
        speed: 0.84,
        walkTime: 0
      });
      this.addShadowCaster(person);
      this.collisionBoxes.push(
        createCollisionBox(`shepherdCompanion${index}Collision`, shepherd.position, 0.28, 0.28, 0.12)
      );
    }

    const sheep = [
      { position: new Vector3(-2.6, 0, 5.85), rotation: 0.25, scale: 0.84 },
      { position: new Vector3(-2.95, 0, 6.72), rotation: -0.2, scale: 0.72 },
      { position: new Vector3(-0.72, 0, 6.95), rotation: 0.74, scale: 0.8 },
      { position: new Vector3(0.28, 0, 5.2), rotation: Math.PI * 0.88, scale: 0.76 },
      { position: new Vector3(-3.25, 0, 4.72), rotation: -0.55, scale: 0.68 },
      { position: new Vector3(0.85, 0, 6.18), rotation: Math.PI * 1.08, scale: 0.7 },
      { position: new Vector3(-1.12, 0, 4.35), rotation: 0.08, scale: 0.66 },
      { position: new Vector3(-3.65, 0, 5.58), rotation: Math.PI * 0.2, scale: 0.62 }
    ];

    for (const [index, sheepConfig] of sheep.entries()) {
      const sheepNode = this.visuals.createSheep(
        `shepherdFlockSheep${index}`,
        sheepConfig.position,
        sheepConfig.scale
      );
      sheepNode.rotation.y = sheepConfig.rotation;
      this.addShadowCaster(sheepNode);
      this.collisionBoxes.push(
        createCollisionBox(
          `shepherdFlockSheep${index}Collision`,
          sheepConfig.position,
          0.22 * sheepConfig.scale,
          0.16 * sheepConfig.scale,
          0.04
        )
      );
    }
  }

  private addShepherdStaff(parent: TransformNode, name: string) {
    const material = new StandardMaterial(`${name}Material`, this.scene);
    material.diffuseColor = new Color3(0.24, 0.14, 0.07);
    material.specularColor = Color3.Black();

    const staff = MeshBuilder.CreateCylinder(
      name,
      { height: 1.18, diameter: 0.045, tessellation: 6 },
      this.scene
    );
    staff.position = new Vector3(0.42, 0.72, 0.08);
    staff.rotation.z = -0.16;
    staff.material = material;
    staff.parent = parent;
  }

  private createMagiCaravan() {
    const wiseMen = [
      {
        position: new Vector3(9.25, 0, 5.68),
        rotation: -Math.PI * 0.18,
        robe: new Color3(0.58, 0.16, 0.16),
        accent: new Color3(0.95, 0.72, 0.22),
        crown: new Color3(0.95, 0.78, 0.24)
      },
      {
        position: new Vector3(10.72, 0, 5.72),
        rotation: Math.PI * 0.2,
        robe: new Color3(0.15, 0.36, 0.58),
        accent: new Color3(0.95, 0.78, 0.33),
        crown: new Color3(0.86, 0.7, 0.18)
      }
    ];

    for (const [index, wiseMan] of wiseMen.entries()) {
      const person = this.visuals.createHumanoid({
        name: `magiCompanion${index}`,
        position: wiseMan.position,
        tunicColor: wiseMan.robe,
        headCoverColor: wiseMan.accent,
        scale: 0.7
      });
      person.rotation.y = wiseMan.rotation;
      this.addMagiAdornment(person, `magiCompanion${index}`, wiseMan.accent, wiseMan.crown);
      this.guidedCompanions.push({
        node: person,
        start: wiseMan.position.clone(),
        destination: new Vector3(6.55 + index * 0.48, 0, -8.45),
        waypoints: [
          new Vector3(8.2 + index * 0.35, 0, 7.25),
          new Vector3(8.85 + index * 0.18, 0, 4.1)
        ],
        path: [],
        waypointIndex: 0,
        speed: 1.02,
        walkTime: 0
      });
      this.addShadowCaster(person);
      this.collisionBoxes.push(
        createCollisionBox(`magiCompanion${index}Collision`, wiseMan.position, 0.32, 0.32, 0.14)
      );
    }

    const attendants = [
      { position: new Vector3(8.55, 0, 4.75), rotation: Math.PI * 0.34, color: new Color3(0.42, 0.29, 0.18) },
      { position: new Vector3(11.5, 0, 4.9), rotation: -Math.PI * 0.35, color: new Color3(0.36, 0.31, 0.22) },
      { position: new Vector3(9.2, 0, 3.98), rotation: Math.PI * 0.08, color: new Color3(0.28, 0.34, 0.22) },
      { position: new Vector3(11.18, 0, 4.02), rotation: -Math.PI * 0.08, color: new Color3(0.34, 0.24, 0.2) }
    ];

    for (const [index, attendant] of attendants.entries()) {
      const person = this.visuals.createHumanoid({
        name: `magiAttendant${index}`,
        position: attendant.position,
        tunicColor: attendant.color,
        headCoverColor: new Color3(0.66, 0.58, 0.42),
        scale: 0.62
      });
      person.rotation.y = attendant.rotation;
      this.guidedCompanions.push({
        node: person,
        start: attendant.position.clone(),
        destination: new Vector3(5.95 + index * 0.36, 0, -8.66 + (index % 2) * 0.18),
        waypoints: [
          new Vector3(8.0 + index * 0.18, 0, 7.05),
          new Vector3(8.55 + index * 0.12, 0, 4.0)
        ],
        path: [],
        waypointIndex: 0,
        speed: 0.94,
        walkTime: 0
      });
      this.addShadowCaster(person);
      this.collisionBoxes.push(
        createCollisionBox(`magiAttendant${index}Collision`, attendant.position, 0.26, 0.26, 0.1)
      );
    }

    const gifts = [
      { position: new Vector3(9.3, 0, 4.6), color: new Color3(0.55, 0.18, 0.1), trim: new Color3(0.95, 0.75, 0.25) },
      { position: new Vector3(10.35, 0, 4.35), color: new Color3(0.18, 0.34, 0.48), trim: new Color3(0.9, 0.72, 0.22) },
      { position: new Vector3(11.05, 0, 4.58), color: new Color3(0.34, 0.18, 0.43), trim: new Color3(0.96, 0.82, 0.36) },
      { position: new Vector3(10.08, 0, 6.12), color: new Color3(0.46, 0.25, 0.1), trim: new Color3(0.86, 0.64, 0.22) }
    ];

    for (const [index, gift] of gifts.entries()) {
      const chest = this.createTreasureChest(`magiGiftChest${index}`, gift.position, gift.color, gift.trim);
      chest.rotation.y = index * 0.5;
      this.addShadowCaster(chest);
    }
  }

  private addMagiAdornment(parent: TransformNode, name: string, accentColor: Color3, crownColor: Color3) {
    const accent = new StandardMaterial(`${name}AccentMaterial`, this.scene);
    accent.diffuseColor = accentColor;
    accent.emissiveColor = accentColor.scale(0.12);
    accent.specularColor = Color3.Black();

    const crownMaterial = new StandardMaterial(`${name}CrownMaterial`, this.scene);
    crownMaterial.diffuseColor = crownColor;
    crownMaterial.emissiveColor = crownColor.scale(0.16);
    crownMaterial.specularColor = Color3.Black();

    const sash = MeshBuilder.CreateBox(
      `${name}Sash`,
      { width: 0.15, height: 0.9, depth: 0.05 },
      this.scene
    );
    sash.position = new Vector3(-0.16, 0.86, -0.34);
    sash.rotation.z = -0.32;
    sash.material = accent;
    sash.parent = parent;

    const belt = MeshBuilder.CreateTorus(
      `${name}Belt`,
      { diameter: 0.58, thickness: 0.035, tessellation: 12 },
      this.scene
    );
    belt.position = new Vector3(0, 0.75, 0);
    belt.rotation.x = Math.PI / 2;
    belt.material = crownMaterial;
    belt.parent = parent;

    const crown = MeshBuilder.CreateCylinder(
      `${name}Crown`,
      { height: 0.14, diameterTop: 0.38, diameterBottom: 0.46, tessellation: 8 },
      this.scene
    );
    crown.position = new Vector3(0, 1.78, 0);
    crown.material = crownMaterial;
    crown.parent = parent;

    const gem = MeshBuilder.CreatePolyhedron(
      `${name}Gem`,
      { type: 1, size: 0.1 },
      this.scene
    );
    gem.position = new Vector3(0, 1.82, -0.23);
    gem.material = accent;
    gem.parent = parent;
  }

  private createTreasureChest(name: string, position: Vector3, color: Color3, trimColor: Color3) {
    const root = new TransformNode(name, this.scene);
    root.position = position.clone();

    const material = new StandardMaterial(`${name}Material`, this.scene);
    material.diffuseColor = color;
    material.specularColor = Color3.Black();
    const trim = new StandardMaterial(`${name}TrimMaterial`, this.scene);
    trim.diffuseColor = trimColor;
    trim.emissiveColor = trimColor.scale(0.12);
    trim.specularColor = Color3.Black();

    const base = MeshBuilder.CreateBox(
      `${name}Base`,
      { width: 0.62, height: 0.34, depth: 0.42 },
      this.scene
    );
    base.position = new Vector3(0, 0.19, 0);
    base.material = material;
    base.parent = root;

    const lid = MeshBuilder.CreateCylinder(
      `${name}Lid`,
      { height: 0.44, diameter: 0.62, tessellation: 8 },
      this.scene
    );
    lid.position = new Vector3(0, 0.4, 0);
    lid.rotation.z = Math.PI / 2;
    lid.scaling.z = 0.68;
    lid.material = material;
    lid.parent = root;

    for (const x of [-0.22, 0.22]) {
      const band = MeshBuilder.CreateBox(
        `${name}Band${x}`,
        { width: 0.06, height: 0.44, depth: 0.46 },
        this.scene
      );
      band.position = new Vector3(x, 0.31, 0);
      band.material = trim;
      band.parent = root;
    }

    const latch = MeshBuilder.CreateBox(
      `${name}Latch`,
      { width: 0.12, height: 0.12, depth: 0.05 },
      this.scene
    );
    latch.position = new Vector3(0, 0.31, -0.24);
    latch.material = trim;
    latch.parent = root;

    return root;
  }

  private isDecorReserved(position: Vector3) {
    const roadCenterX = Math.tan(Math.PI / 10) * position.z * 0.45;
    if (Math.abs(position.x - roadCenterX) < 3.15) return true;

    const reservedAreas = [
      { x: -5.2, z: 1.2, halfX: 3.4, halfZ: 2.8 },
      { x: 3.7, z: 2.2, halfX: 2.9, halfZ: 2.4 },
      { x: 5.9, z: -5.7, halfX: 3.2, halfZ: 2.3 },
      { x: -6.2, z: -5.7, halfX: 3.3, halfZ: 2.4 },
      { x: -5.2, z: -1.25, halfX: 1.3, halfZ: 1.2 },
      { x: -1, z: 5.5, halfX: 1.5, halfZ: 1.4 },
      { x: 10, z: 4.9, halfX: 2.7, halfZ: 2.4 },
      { x: 5.9, z: -5.7, halfX: 1.8, halfZ: 1.5 },
      { x: 6.1, z: -6.8, halfX: 1.8, halfZ: 1.4 },
      { x: 0, z: 9, halfX: 1.8, halfZ: 1.6 }
    ];

    return reservedAreas.some(
      (area) =>
        Math.abs(position.x - area.x) < area.halfX &&
        Math.abs(position.z - area.z) < area.halfZ
    );
  }

  private decorNoise(x: number, z: number) {
    const value = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  private createWorldStateVisuals() {
    this.preparedStableBlanket = this.visuals.createSpreadBlanket(
      "preparedStableBlanket",
      new Vector3(6.25, 0, -6.15),
      new Color3(0.96, 0.86, 0.58)
    );
    this.preparedStableBlanket.rotation.y = Math.PI / 12;
    this.preparedStableBlanket.setEnabled(false);
    this.nativityGroup = this.createNativityGroup();
    this.nativityGroup.setEnabled(false);
    this.infantJesusGroup = this.createInfantJesusGroup();
    this.infantJesusGroup.setEnabled(false);
    this.guidingStarRoot = this.createGuidingStar();
    this.guidingStarRoot.setEnabled(false);
  }

  private updateWorldStateVisuals() {
    const stablePrepared = this.worldStateIds.has("stable_prepared");
    const isStarGuiding = this.worldStateIds.has("star_guiding_to_manger");
    this.preparedStableBlanket?.setEnabled(stablePrepared);
    this.nativityGroup?.setEnabled(this.worldStateIds.has("travelers_led_to_stable"));
    this.infantJesusGroup?.setEnabled(this.worldStateIds.has("infant_jesus_born"));
    this.guidingStarRoot?.setEnabled(isStarGuiding);

    if (!isStarGuiding) {
      this.guidingStarProgress = 0;
      this.guidingStarRoot?.position.copyFrom(GUIDING_STAR_START);
      for (const companion of this.guidedCompanions) {
        companion.node.position.copyFrom(companion.start);
        companion.waypointIndex = 0;
        companion.walkTime = 0;
        this.animateGuidedCompanionWalk(companion, 0, false);
      }
    }
  }

  private createNativityGroup() {
    const root = new TransformNode("nativityGroup", this.scene);
    const infantPosition = new Vector3(6.0, 0, -5.78);

    const mary = this.visuals.createHumanoid({
      name: "maryFigure",
      position: new Vector3(5.15, 0, -5.45),
      tunicColor: new Color3(0.22, 0.34, 0.58),
      headCoverColor: new Color3(0.86, 0.79, 0.66),
      scale: 0.62,
      showBelt: false
    });
    mary.rotation.y = this.rotationToward(mary.position, infantPosition);
    mary.parent = root;
    this.addShawl(mary, "maryShawl", new Color3(0.12, 0.22, 0.44));
    this.addMaryHeadCovering(mary);

    const joseph = this.visuals.createHumanoid({
      name: "josephFigure",
      position: new Vector3(6.85, 0, -5.35),
      tunicColor: new Color3(0.44, 0.28, 0.16),
      headCoverColor: new Color3(0.73, 0.64, 0.48),
      scale: 0.66
    });
    joseph.rotation.y = this.rotationToward(joseph.position, infantPosition);
    joseph.parent = root;
    this.addShepherdStaff(joseph, "josephStaff");

    this.addShadowCaster(root);
    return root;
  }

  private createInfantJesusGroup() {
    const root = new TransformNode("infantJesusGroup", this.scene);
    const manger = this.createMangerWithInfant("infantJesusManger", new Vector3(6.0, 0, -5.78));
    manger.rotation.y = Math.PI / 2.8;
    manger.parent = root;
    this.addShadowCaster(root);
    return root;
  }

  private createGuidingStar() {
    const root = new TransformNode("guidingStarRoot", this.scene);
    root.position = GUIDING_STAR_START.clone();
    this.createStarVisual("guidingStarVisual", root);

    const lightMaterial = new StandardMaterial("guidingStarGroundLightMaterial", this.scene);
    lightMaterial.diffuseColor = new Color3(1, 0.84, 0.24);
    lightMaterial.emissiveColor = new Color3(1, 0.62, 0.08);
    lightMaterial.alpha = 0.34;
    lightMaterial.specularColor = Color3.Black();

    const groundLight = MeshBuilder.CreateDisc(
      "guidingStarGroundLight",
      { radius: 1.35, tessellation: 64 },
      this.scene
    );
    groundLight.rotation.x = Math.PI / 2;
    groundLight.position = new Vector3(0, 0.025, 0);
    groundLight.material = lightMaterial;
    groundLight.metadata = {
      ...(groundLight.metadata ?? {}),
      isStarLightShadow: true,
      baseScale: 1,
      arrivedScale: 2.65
    };
    groundLight.parent = root;
    this.guidingStarGroundLight = groundLight;

    return root;
  }

  private addShawl(parent: TransformNode, name: string, color: Color3) {
    const material = new StandardMaterial(`${name}Material`, this.scene);
    material.diffuseColor = color;
    material.specularColor = Color3.Black();
    material.backFaceCulling = false;

    const shawl = MeshBuilder.CreateRibbon(
      name,
      {
        pathArray: [
          [
            new Vector3(-0.28, 1.23, -0.24),
            new Vector3(-0.24, 0.98, -0.29),
            new Vector3(-0.17, 0.76, -0.25)
          ],
          [
            new Vector3(0, 1.3, -0.28),
            new Vector3(0, 0.98, -0.34),
            new Vector3(0, 0.7, -0.29)
          ],
          [
            new Vector3(0.28, 1.23, -0.24),
            new Vector3(0.24, 0.98, -0.29),
            new Vector3(0.17, 0.76, -0.25)
          ]
        ],
        sideOrientation: Mesh.DOUBLESIDE
      },
      this.scene
    );
    shawl.material = material;
    shawl.parent = parent;
  }

  private addMaryHeadCovering(parent: TransformNode) {
    const defaultCover = parent.getChildMeshes(false).find((mesh) => mesh.name === "maryFigureHeadCover");
    if (defaultCover) {
      defaultCover.scaling = new Vector3(0.82, 0.46, 0.92);
      defaultCover.position.y = 1.62;
    }

    const hairMaterial = new StandardMaterial("maryLongHairMaterial", this.scene);
    hairMaterial.diffuseColor = new Color3(0.16, 0.09, 0.045);
    hairMaterial.specularColor = Color3.Black();

    const veilMaterial = new StandardMaterial("maryVeilMaterial", this.scene);
    veilMaterial.diffuseColor = new Color3(0.86, 0.78, 0.64);
    veilMaterial.specularColor = Color3.Black();
    veilMaterial.backFaceCulling = false;

    const hairStrands = [
      { x: -0.16, z: -0.18, height: 0.52, tilt: 0.1 },
      { x: 0, z: -0.23, height: 0.58, tilt: 0 },
      { x: 0.16, z: -0.18, height: 0.52, tilt: -0.1 }
    ];

    for (const [index, strand] of hairStrands.entries()) {
      const hair = MeshBuilder.CreateCylinder(
        `maryLongHairStrand${index}`,
        { height: strand.height, diameterTop: 0.08, diameterBottom: 0.12, tessellation: 7 },
        this.scene
      );
      hair.position = new Vector3(strand.x, 1.22, strand.z);
      hair.rotation.z = strand.tilt;
      hair.material = hairMaterial;
      hair.parent = parent;
    }

    const veilCap = MeshBuilder.CreateSphere(
      "maryVeilTop",
      { diameter: 0.56, segments: 12 },
      this.scene
    );
    veilCap.position = new Vector3(0, 1.6, -0.05);
    veilCap.scaling = new Vector3(0.88, 0.34, 0.72);
    veilCap.material = veilMaterial;
    veilCap.parent = parent;

    const veilBack = MeshBuilder.CreateRibbon(
      "maryVeilBack",
      {
        pathArray: [
          [
            new Vector3(-0.3, 1.54, -0.14),
            new Vector3(-0.34, 1.22, -0.22),
            new Vector3(-0.24, 0.93, -0.24)
          ],
          [
            new Vector3(0, 1.64, -0.18),
            new Vector3(0, 1.2, -0.31),
            new Vector3(0, 0.84, -0.31)
          ],
          [
            new Vector3(0.3, 1.54, -0.14),
            new Vector3(0.34, 1.22, -0.22),
            new Vector3(0.24, 0.93, -0.24)
          ]
        ],
        sideOrientation: Mesh.DOUBLESIDE
      },
      this.scene
    );
    veilBack.material = veilMaterial;
    veilBack.parent = parent;

    for (const side of [-1, 1]) {
      const veilSide = MeshBuilder.CreateRibbon(
        `maryVeilSide${side}`,
        {
          pathArray: [
            [
              new Vector3(side * 0.22, 1.52, -0.02),
              new Vector3(side * 0.28, 1.23, -0.04),
              new Vector3(side * 0.2, 0.96, -0.08)
            ],
            [
              new Vector3(side * 0.08, 1.48, 0.02),
              new Vector3(side * 0.13, 1.18, 0.0),
              new Vector3(side * 0.1, 0.98, -0.04)
            ]
          ],
          sideOrientation: Mesh.DOUBLESIDE
        },
        this.scene
      );
      veilSide.material = veilMaterial;
      veilSide.parent = parent;
    }
  }

  private createMangerWithInfant(name: string, position: Vector3) {
    const root = new TransformNode(name, this.scene);
    root.position = position.clone();

    const wood = new StandardMaterial(`${name}WoodMaterial`, this.scene);
    wood.diffuseColor = new Color3(0.3, 0.18, 0.08);
    wood.specularColor = Color3.Black();
    const straw = new StandardMaterial(`${name}StrawMaterial`, this.scene);
    straw.diffuseColor = new Color3(0.92, 0.74, 0.32);
    straw.specularColor = Color3.Black();
    const cloth = new StandardMaterial(`${name}ClothMaterial`, this.scene);
    cloth.diffuseColor = new Color3(0.94, 0.86, 0.68);
    cloth.specularColor = Color3.Black();
    const skin = new StandardMaterial(`${name}SkinMaterial`, this.scene);
    skin.diffuseColor = new Color3(0.72, 0.5, 0.32);
    skin.specularColor = Color3.Black();

    const bed = MeshBuilder.CreateBox(
      `${name}Bed`,
      { width: 0.98, height: 0.18, depth: 0.48 },
      this.scene
    );
    bed.position = new Vector3(0, 0.28, 0);
    bed.material = wood;
    bed.parent = root;

    for (const x of [-0.42, 0.42]) {
      const side = MeshBuilder.CreateBox(
        `${name}Side${x}`,
        { width: 0.08, height: 0.34, depth: 0.56 },
        this.scene
      );
      side.position = new Vector3(x, 0.42, 0);
      side.material = wood;
      side.parent = root;
    }

    for (const x of [-0.33, 0.33]) {
      for (const z of [-0.18, 0.18]) {
        const leg = MeshBuilder.CreateCylinder(
          `${name}Leg${x}${z}`,
          { height: 0.36, diameter: 0.055, tessellation: 5 },
          this.scene
        );
        leg.position = new Vector3(x, 0.13, z);
        leg.rotation.x = z > 0 ? 0.16 : -0.16;
        leg.material = wood;
        leg.parent = root;
      }
    }

    const strawBed = MeshBuilder.CreateBox(
      `${name}Straw`,
      { width: 0.78, height: 0.08, depth: 0.36 },
      this.scene
    );
    strawBed.position = new Vector3(0, 0.42, 0);
    strawBed.material = straw;
    strawBed.parent = root;

    const swaddle = MeshBuilder.CreateCylinder(
      `${name}Swaddle`,
      { height: 0.48, diameter: 0.2, tessellation: 8 },
      this.scene
    );
    swaddle.position = new Vector3(0.02, 0.53, 0);
    swaddle.rotation.z = Math.PI / 2;
    swaddle.material = cloth;
    swaddle.parent = root;

    const head = MeshBuilder.CreateSphere(
      `${name}Head`,
      { diameter: 0.16, segments: 8 },
      this.scene
    );
    head.position = new Vector3(-0.27, 0.55, 0);
    head.material = skin;
    head.parent = root;

    const haloRoot = new TransformNode(`${name}HaloRoot`, this.scene);
    haloRoot.position = new Vector3(-0.27, 0.69, 0);
    haloRoot.parent = root;
    this.infantHalo = haloRoot;

    const halo = MeshBuilder.CreateTorus(
      `${name}SoftGlow`,
      { diameter: 0.42, thickness: 0.018, tessellation: 24 },
      this.scene
    );
    const haloMaterial = new StandardMaterial(`${name}GlowMaterial`, this.scene);
    haloMaterial.diffuseColor = new Color3(1, 0.86, 0.36);
    haloMaterial.emissiveColor = new Color3(1, 0.7, 0.16);
    haloMaterial.alpha = 0.84;
    halo.material = haloMaterial;
    halo.parent = haloRoot;

    for (let index = 0; index < 18; index += 1) {
      const angle = (Math.PI * 2 * index) / 18;
      const sparkle = MeshBuilder.CreatePolyhedron(
        `${name}Sparkle${index}`,
        { type: 1, size: index % 3 === 0 ? 0.045 : 0.033 },
        this.scene
      );
      sparkle.position = new Vector3(
        Math.cos(angle) * (0.25 + (index % 2) * 0.06),
        Math.sin(index * 1.7) * 0.025,
        Math.sin(angle) * (0.16 + (index % 3) * 0.025)
      );
      sparkle.rotation.y = angle;
      sparkle.material = haloMaterial;
      sparkle.parent = haloRoot;
    }

    return root;
  }

  private animateInfantHalo(deltaSeconds: number) {
    if (!this.infantHalo || !this.infantHalo.isEnabled()) return;
    this.infantHalo.rotation.y += deltaSeconds * 0.95;
    this.infantHalo.rotation.z += deltaSeconds * 0.22;
  }

  private animateGuidingStarAndCompanions(deltaSeconds: number) {
    if (!this.guidingStarRoot?.isEnabled()) return;
    this.ensureGuidedCompanionPaths();

    this.guidingStarProgress = Math.min(1, this.guidingStarProgress + deltaSeconds * 0.045);
    const easedProgress = this.easeInOut(this.guidingStarProgress);
    const pathPosition = this.sampleGuidingStarPath(easedProgress);
    const hasArrived = this.guidingStarProgress >= 1;
    const hover = hasArrived ? 0 : Math.sin(this.markerPulseTime * 1.05) * 0.32;
    this.guidingStarRoot.position = new Vector3(pathPosition.x, 0, pathPosition.z);

    const star = this.guidingStarRoot.getChildTransformNodes(false).find((child) =>
      this.isStarVisualRoot(child)
    );
    if (star) {
      const baseScale = Number(star.metadata?.baseScale ?? 1);
      const baseY = Number(star.metadata?.baseY ?? star.position.y);
      const pulse = hasArrived
        ? 1.18 + Math.sin(this.markerPulseTime * 1.2) * 0.04
        : 1 + Math.sin(this.markerPulseTime * 1.6) * 0.12;
      star.position.y = baseY + hover;
      star.scaling.setAll(baseScale * pulse);
      if (!hasArrived) {
        star.rotation.z += deltaSeconds * 0.18;
      }
    }

    if (this.guidingStarGroundLight) {
      const baseScale = hasArrived
        ? Number(this.guidingStarGroundLight.metadata?.arrivedScale ?? 2.65)
        : Number(this.guidingStarGroundLight.metadata?.baseScale ?? 1);
      const glowScale = baseScale * (1 + Math.sin(this.markerPulseTime * 1.25) * (hasArrived ? 0.08 : 0.18));
      this.guidingStarGroundLight.scaling.set(glowScale, glowScale, glowScale);
    }

    for (const companion of this.guidedCompanions) {
      const target = companion.path[companion.waypointIndex];
      if (!target) {
        this.animateGuidedCompanionWalk(companion, deltaSeconds, false);
        continue;
      }
      const toTarget = target.subtract(companion.node.position);
      toTarget.y = 0;
      const distance = toTarget.length();
      if (distance < 0.08) {
        companion.waypointIndex += 1;
        this.animateGuidedCompanionWalk(companion, deltaSeconds, false);
        continue;
      }
      const step = Math.min(distance, companion.speed * deltaSeconds);
      const direction = toTarget.normalize();
      const nextPosition = companion.node.position.add(direction.scale(step));
      if (this.isPositionInsideBlockingCollision(nextPosition)) {
        companion.waypointIndex += 1;
        this.animateGuidedCompanionWalk(companion, deltaSeconds, false);
        continue;
      }
      companion.node.position.copyFrom(nextPosition);
      companion.node.rotation.y = Math.atan2(direction.x, direction.z);
      this.animateGuidedCompanionWalk(companion, deltaSeconds, true);
    }
  }

  private animateGuidedCompanionWalk(companion: GuidedCompanion, deltaSeconds: number, isMoving: boolean) {
    const parts = companion.animationParts ?? this.findHumanoidAnimationParts(companion.node);
    if (!parts) return;
    companion.animationParts = parts;

    if (isMoving) {
      companion.walkTime += deltaSeconds * (7.2 + companion.speed * 1.8);
    }

    const swing = isMoving ? Math.sin(companion.walkTime) * 0.42 : 0;
    const returnSpeed = isMoving ? 1 : Math.min(1, deltaSeconds * 8);

    parts.leftArm.rotation.x = this.lerp(parts.leftArm.rotation.x, swing, returnSpeed);
    parts.rightArm.rotation.x = this.lerp(parts.rightArm.rotation.x, -swing, returnSpeed);
    parts.leftLeg.rotation.x = this.lerp(parts.leftLeg.rotation.x, -swing * 0.72, returnSpeed);
    parts.rightLeg.rotation.x = this.lerp(parts.rightLeg.rotation.x, swing * 0.72, returnSpeed);
  }

  private findHumanoidAnimationParts(node: TransformNode) {
    const ownParts = node.metadata?.humanoidParts as HumanoidAnimationParts | undefined;
    if (ownParts) return ownParts;

    for (const child of node.getChildTransformNodes(false)) {
      const childParts = child.metadata?.humanoidParts as HumanoidAnimationParts | undefined;
      if (childParts) return childParts;
    }

    return undefined;
  }

  private createGuidedCompanionPaths() {
    for (const companion of this.guidedCompanions) {
      this.createGuidedCompanionPath(companion);
      companion.waypointIndex = 0;
    }
  }

  private ensureGuidedCompanionPaths() {
    for (const companion of this.guidedCompanions) {
      if (companion.path.length > 0) continue;
      this.createGuidedCompanionPath(companion);
      companion.waypointIndex = 0;
    }
  }

  private createGuidedCompanionPath(companion: GuidedCompanion) {
    const routePoints = [companion.start, ...companion.waypoints, companion.destination];
    const path: Vector3[] = [];
    for (let index = 0; index < routePoints.length - 1; index += 1) {
      path.push(...this.findPath(routePoints[index], routePoints[index + 1]));
    }
    companion.path = path;
  }

  private findPath(start: Vector3, goal: Vector3) {
    const cellSize = 0.75;
    const toCell = (position: Vector3) => ({
      x: Math.round(position.x / cellSize),
      z: Math.round(position.z / cellSize)
    });
    const toWorld = (cell: { x: number; z: number }) => new Vector3(cell.x * cellSize, 0, cell.z * cellSize);
    const keyOf = (cell: { x: number; z: number }) => `${cell.x}:${cell.z}`;
    const startCell = toCell(start);
    const goalCell = toCell(goal);
    const minX = Math.floor(this.movementBounds.minX / cellSize);
    const maxX = Math.ceil(this.movementBounds.maxX / cellSize);
    const minZ = Math.floor(this.movementBounds.minZ / cellSize);
    const maxZ = Math.ceil(this.movementBounds.maxZ / cellSize);
    const open = new Set([keyOf(startCell)]);
    const cameFrom = new Map<string, string>();
    const cells = new Map<string, { x: number; z: number }>([[keyOf(startCell), startCell]]);
    const gScore = new Map<string, number>([[keyOf(startCell), 0]]);
    const fScore = new Map<string, number>([
      [keyOf(startCell), this.pathHeuristic(startCell, goalCell)]
    ]);
    const directions = [
      { x: 1, z: 0 },
      { x: -1, z: 0 },
      { x: 0, z: 1 },
      { x: 0, z: -1 },
      { x: 1, z: 1 },
      { x: 1, z: -1 },
      { x: -1, z: 1 },
      { x: -1, z: -1 }
    ];

    while (open.size > 0) {
      const currentKey = Array.from(open).reduce((best, candidate) =>
        (fScore.get(candidate) ?? Infinity) < (fScore.get(best) ?? Infinity) ? candidate : best
      );
      const current = cells.get(currentKey);
      if (!current) break;
      if (current.x === goalCell.x && current.z === goalCell.z) {
        return this.simplifyPath(this.reconstructPath(currentKey, cameFrom, cells).map(toWorld), goal);
      }

      open.delete(currentKey);
      for (const direction of directions) {
        const neighbor = { x: current.x + direction.x, z: current.z + direction.z };
        if (neighbor.x < minX || neighbor.x > maxX || neighbor.z < minZ || neighbor.z > maxZ) continue;
        if (this.isPositionInsidePathObstacle(toWorld(neighbor))) continue;
        const neighborKey = keyOf(neighbor);
        cells.set(neighborKey, neighbor);
        const movementCost = direction.x !== 0 && direction.z !== 0 ? 1.4 : 1;
        const tentativeGScore = (gScore.get(currentKey) ?? Infinity) + movementCost;
        if (tentativeGScore >= (gScore.get(neighborKey) ?? Infinity)) continue;
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + this.pathHeuristic(neighbor, goalCell));
        open.add(neighborKey);
      }
    }

    return [goal.clone()];
  }

  private reconstructPath(
    currentKey: string,
    cameFrom: Map<string, string>,
    cells: Map<string, { x: number; z: number }>
  ) {
    const path: Array<{ x: number; z: number }> = [];
    let cursor: string | undefined = currentKey;
    while (cursor) {
      const cell = cells.get(cursor);
      if (cell) path.unshift(cell);
      cursor = cameFrom.get(cursor);
    }
    return path.slice(1);
  }

  private simplifyPath(path: Vector3[], goal: Vector3) {
    const simplified: Vector3[] = [];
    let previousDirection = "";
    for (let index = 0; index < path.length; index += 1) {
      const previous = index === 0 ? path[index] : path[index - 1];
      const current = path[index];
      const next = path[index + 1];
      const direction = next
        ? `${Math.sign(next.x - current.x)}:${Math.sign(next.z - current.z)}`
        : "end";
      if (index === path.length - 1 || direction !== previousDirection) {
        simplified.push(current);
      }
      previousDirection = `${Math.sign(current.x - previous.x)}:${Math.sign(current.z - previous.z)}`;
    }
    simplified.push(goal.clone());
    return simplified;
  }

  private pathHeuristic(a: { x: number; z: number }, b: { x: number; z: number }) {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  private sampleGuidingStarPath(progress: number) {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const segmentCount = GUIDING_STAR_PATH.length - 1;
    const scaled = clampedProgress * segmentCount;
    const segmentIndex = Math.min(segmentCount - 1, Math.floor(scaled));
    const segmentProgress = scaled - segmentIndex;
    return Vector3.Lerp(
      GUIDING_STAR_PATH[segmentIndex],
      GUIDING_STAR_PATH[segmentIndex + 1],
      segmentProgress
    );
  }

  private easeInOut(value: number) {
    return value * value * (3 - 2 * value);
  }

  private isPositionInsideBlockingCollision(position: Vector3) {
    return this.collisionBoxes.some((box) => {
      if (this.isIgnoredPathObstacle(box)) return false;
      return (
        position.x > box.minX &&
        position.x < box.maxX &&
        position.z > box.minZ &&
        position.z < box.maxZ
      );
    });
  }

  private isPositionInsidePathObstacle(position: Vector3) {
    const clearance = 0.22;
    return this.collisionBoxes.some((box) => {
      if (this.isIgnoredPathObstacle(box)) return false;
      return (
        position.x > box.minX - clearance &&
        position.x < box.maxX + clearance &&
        position.z > box.minZ - clearance &&
        position.z < box.maxZ + clearance
      );
    });
  }

  private isIgnoredPathObstacle(box: CollisionBox) {
    return !this.isBuildingWallCollision(box);
  }

  private isBuildingWallCollision(box: CollisionBox) {
    return (
      box.id.endsWith("BackWall") ||
      box.id.endsWith("LeftWall") ||
      box.id.endsWith("RightWall") ||
      box.id.endsWith("FrontLeftWall") ||
      box.id.endsWith("FrontRightWall")
    );
  }

  private createBuilding(name: string, position: Vector3, scaling: Vector3, color: Color3) {
    const building = this.visuals.createBuilding({
      name,
      position,
      size: scaling,
      wallColor: color
    });
    this.addShadowCaster(building.root);
    this.addShadowReceivers(building.root);
    this.addBuildingWallCollisions(name, position, scaling);
    this.interiorZones.push({
      id: name,
      minX: position.x - scaling.x / 2 + 0.35,
      maxX: position.x + scaling.x / 2 - 0.35,
      minZ: position.z - scaling.z / 2 + 0.35,
      maxZ: position.z + scaling.z / 2 - 0.35,
      roof: building.roof,
      roofMaterial: building.roofMaterial,
      targetAlpha: 1
    });
    this.createInteriorObjectiveMarker(
      name,
      new Vector3(position.x, 0, position.z - scaling.z / 2 - 0.55)
    );
  }

  private createInteriorObjectiveMarker(zoneId: string, position: Vector3) {
    const root = new TransformNode(`${zoneId}InteriorObjectiveMarker`, this.scene);
    root.position = position.clone();

    const ring = this.visuals.createInteractionRing(
      `${zoneId}InteriorObjectiveRing`,
      Vector3.Zero(),
      new Color3(1, 0.86, 0.22),
      1.25
    );
    ring.parent = root;

    root.setEnabled(false);
    this.interiorObjectiveMarkers.push({ zoneId, node: root });
  }

  private updateBuildingRoofs(deltaSeconds: number) {
    const playerPosition = this.player.getPosition();
    for (const zone of this.interiorZones) {
      const isInside =
        playerPosition.x >= zone.minX &&
        playerPosition.x <= zone.maxX &&
        playerPosition.z >= zone.minZ &&
        playerPosition.z <= zone.maxZ;

      zone.targetAlpha = isInside ? 0.12 : 1;
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

  private createSign(label: string, position: Vector3, width = 1.4) {
    const root = new TransformNode(`${label}Sign`, this.scene);
    root.position = position.clone();

    const board = MeshBuilder.CreateBox(
      `${label}SignBoard`,
      { width, height: 0.44, depth: 0.08 },
      this.scene
    );
    board.material = this.createSignBoardMaterial(`${label}SignBoardMaterial`);
    board.parent = root;

    const textTexture = new DynamicTexture(
      `${label}SignTexture`,
      { width: 512, height: 192 },
      this.scene,
      true
    );
    textTexture.hasAlpha = true;
    textTexture.drawText(
      label.toUpperCase(),
      null,
      116,
      "bold 76px Arial",
      "#f7df94",
      "transparent",
      true
    );

    const textMaterial = new StandardMaterial(`${label}SignTextMaterial`, this.scene);
    textMaterial.diffuseTexture = textTexture;
    textMaterial.emissiveTexture = textTexture;
    textMaterial.emissiveColor = new Color3(0.95, 0.76, 0.32);
    textMaterial.opacityTexture = textTexture;
    textMaterial.backFaceCulling = false;

    const text = MeshBuilder.CreatePlane(
      `${label}SignText`,
      { width: width * 0.84, height: 0.28 },
      this.scene
    );
    text.position = new Vector3(0, 0.01, -0.046);
    text.material = textMaterial;
    text.parent = root;

    this.addShadowCaster(root);
  }

  private createSignBoardMaterial(name: string) {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = new Color3(0.36, 0.2, 0.08);
    material.emissiveColor = new Color3(0.05, 0.03, 0.01);
    return material;
  }

  private createMarkers() {
    const markerConfigs: MarkerConfig[] = [
      {
        id: "npc_innkeeper",
        label: "Talk with the innkeeper",
        type: "npc",
        targetId: "innkeeper_01",
        position: new Vector3(-5.2, 0, -1.25),
        color: new Color3(0.25, 0.42, 0.72)
      },
      {
        id: "npc_shepherd",
        label: "Talk with the shepherd",
        type: "npc",
        targetId: "shepherd_01",
        position: new Vector3(-1, 0, 5.5),
        color: new Color3(0.23, 0.55, 0.34)
      },
      {
        id: "npc_magi",
        label: "Talk with the traveler from the East",
        type: "npc",
        targetId: "magi_01",
        position: new Vector3(10.0, 0, 4.9),
        color: new Color3(0.45, 0.3, 0.63)
      },
      {
        id: "item_blanket",
        label: "Collect clean blanket",
        type: "item",
        targetId: "blanket",
        interiorZoneId: "market",
        position: new Vector3(-5.8, 0, -4.7),
        color: new Color3(0.91, 0.82, 0.64)
      },
      {
        id: "stable_area",
        label: "Prepare the stable",
        type: "location",
        targetId: "stable_area",
        itemId: "blanket",
        interiorZoneId: "stable",
        position: new Vector3(5.9, 0, -5.7),
        color: new Color3(0.95, 0.72, 0.28)
      },
      {
        id: "manger_scene",
        label: "Witness the manger scene",
        type: "observe",
        targetId: "manger_scene",
        position: new Vector3(6.1, 0, -6.8),
        color: new Color3(1, 0.93, 0.66)
      },
      {
        id: "star_viewpoint",
        label: "Observe the star",
        type: "observe",
        targetId: "star_viewpoint",
        position: new Vector3(0, 0, 9),
        color: new Color3(0.98, 0.92, 0.38)
      },
      {
        id: "star_guided_stable",
        label: "Follow the star to the manger",
        type: "location",
        targetId: "star_guided_stable",
        interiorZoneId: "stable",
        position: new Vector3(6.1, 0, -6.45),
        color: new Color3(1, 0.88, 0.32)
      }
    ];

    for (const config of markerConfigs) {
      const marker = this.createMarkerMesh(config);
      marker.position = config.position.clone();
      marker.metadata = { interaction: config };

      this.markers.push({
        node: marker,
        interaction: {
          id: config.id,
          label: config.label,
          type: config.type,
          targetId: config.targetId,
          itemId: config.itemId,
          interiorZoneId: config.interiorZoneId
        }
      });
    }
  }

  private createMarkerMesh(config: MarkerConfig) {
    if (config.type === "npc") {
      const root = new TransformNode(config.id, this.scene);
      const humanoid = this.visuals.createHumanoid({
        name: `${config.id}Humanoid`,
        position: Vector3.Zero(),
        tunicColor: config.color,
        headCoverColor: new Color3(0.78, 0.7, 0.56),
        scale: 0.68
      });
      humanoid.parent = root;
      if (config.id === "npc_shepherd") {
        this.addShepherdStaff(humanoid, `${config.id}Staff`);
      }
      if (config.id === "npc_magi") {
        this.addMagiAdornment(
          humanoid,
          config.id,
          new Color3(0.95, 0.7, 0.24),
          new Color3(0.92, 0.78, 0.28)
        );
      }
      this.addShadowCaster(humanoid);
      const interactionRing = this.visuals.createInteractionRing(
        `${config.id}InteractionRing`,
        Vector3.Zero(),
        config.color,
        1.05
      );
      interactionRing.parent = root;
      this.collisionBoxes.push(
        createCollisionBox(`${config.id}Collision`, config.position, 0.32, 0.32, 0.18)
      );
      if (config.id === "npc_shepherd") {
        this.guidedCompanions.push({
          node: root,
          start: config.position.clone(),
          destination: new Vector3(4.25, 0, -8.58),
          waypoints: [],
          path: [],
          waypointIndex: 0,
          speed: 0.82,
          walkTime: 0
        });
      }
      if (config.id === "npc_magi") {
        this.guidedCompanions.push({
          node: root,
          start: config.position.clone(),
          destination: new Vector3(7.72, 0, -8.38),
          waypoints: [
            new Vector3(8.75, 0, 7.4),
            new Vector3(9.1, 0, 4.15)
          ],
          path: [],
          waypointIndex: 0,
          speed: 1.0,
          walkTime: 0
        });
      }
      return root;
    }

    if (config.type === "item") {
      const root = this.visuals.createBlanketBundle(config.id, Vector3.Zero(), config.color);
      const interactionRing = this.visuals.createInteractionRing(
        `${config.id}GroundRing`,
        Vector3.Zero(),
        new Color3(1, 0.86, 0.22),
        0.95
      );
      interactionRing.parent = root;
      return root;
    }

    if (config.type === "location") {
      const root = new TransformNode(config.id, this.scene);
      const ring = this.visuals.createInteractionRing(
        `${config.id}LocationRing`,
        Vector3.Zero(),
        config.color,
        1.25
      );
      ring.parent = root;
      return root;
    }

    const root = new TransformNode(config.id, this.scene);
    const ring = this.visuals.createInteractionRing(
      `${config.id}ObserveRing`,
      Vector3.Zero(),
      config.color,
      1.2
    );
    ring.parent = root;
    if (config.id === "star_viewpoint") {
      this.createStarVisual(`${config.id}Star`, root);
    }
    return root;
  }

  private createStarVisual(name: string, parent: TransformNode) {
    const root = new TransformNode(name, this.scene);
    root.position = new Vector3(0, 4.2, 0);
    root.scaling.setAll(1.15);
    root.billboardMode = TransformNode.BILLBOARDMODE_ALL;
    root.metadata = {
      ...(root.metadata ?? {}),
      isStarVisual: true,
      isStarVisualRoot: true,
      baseScale: root.scaling.x,
      baseY: root.position.y
    };
    root.parent = parent;

    const coreMaterial = new StandardMaterial(`${name}CoreMaterial`, this.scene);
    coreMaterial.diffuseColor = new Color3(1, 0.9, 0.34);
    coreMaterial.emissiveColor = new Color3(1, 0.78, 0.18);
    coreMaterial.specularColor = Color3.Black();

    const glowMaterial = new StandardMaterial(`${name}GlowMaterial`, this.scene);
    glowMaterial.diffuseColor = new Color3(1, 0.86, 0.22);
    glowMaterial.emissiveColor = new Color3(1, 0.68, 0.08);
    glowMaterial.alpha = 0.38;
    glowMaterial.specularColor = Color3.Black();

    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const longRay = index % 2 === 0;
      const ray = MeshBuilder.CreateBox(
        `${name}Ray${index}`,
        { width: longRay ? 0.16 : 0.12, height: longRay ? 1.28 : 0.82, depth: 0.035 },
        this.scene
      );
      ray.position = new Vector3(Math.sin(angle) * 0.34, Math.cos(angle) * 0.34, 0);
      ray.rotation.z = -angle;
      ray.material = coreMaterial;
      ray.metadata = { ...(ray.metadata ?? {}), isStarVisual: true };
      ray.parent = root;
    }

    const core = MeshBuilder.CreateSphere(
      `${name}Core`,
      { diameter: 0.48, segments: 10 },
      this.scene
    );
    core.scaling.z = 0.2;
    core.material = coreMaterial;
    core.metadata = { ...(core.metadata ?? {}), isStarVisual: true };
    core.parent = root;

    const glow = MeshBuilder.CreateSphere(
      `${name}Glow`,
      { diameter: 1.35, segments: 16 },
      this.scene
    );
    glow.scaling.z = 0.08;
    glow.material = glowMaterial;
    glow.metadata = { ...(glow.metadata ?? {}), isStarVisual: true };
    glow.parent = root;

    return root;
  }

  private getInteractionAnchorHeight(root: TransformNode) {
    const rootAnchorHeight = Number(root.metadata?.interactionAnchorHeight);
    if (Number.isFinite(rootAnchorHeight) && rootAnchorHeight > 0) {
      return rootAnchorHeight;
    }

    for (const child of root.getChildTransformNodes(false)) {
      const childAnchorHeight = Number(child.metadata?.interactionAnchorHeight);
      if (Number.isFinite(childAnchorHeight) && childAnchorHeight > 0) {
        return childAnchorHeight;
      }
    }

    return this.getVisualHeight(root);
  }

  private getVisualHeight(root: TransformNode) {
    const metadataHeight = Number(root.metadata?.visualHeight);
    if (Number.isFinite(metadataHeight) && metadataHeight > 0) {
      return metadataHeight;
    }

    for (const child of root.getChildTransformNodes(false)) {
      const childHeight = Number(child.metadata?.visualHeight);
      if (Number.isFinite(childHeight) && childHeight > 0) {
        return childHeight;
      }
    }

    root.computeWorldMatrix(true);
    let maxY = 0;

    for (const mesh of root.getChildMeshes(false)) {
      if (this.isInteractionRing(mesh) || this.isInteractionArrow(mesh)) continue;
      mesh.computeWorldMatrix(true);
      maxY = Math.max(maxY, mesh.getBoundingInfo().boundingBox.maximumWorld.y);
    }

    return Math.max(0.35, maxY - root.absolutePosition.y);
  }

  private updateNearestInteraction() {
    const playerPosition = this.player.getPosition();
    let nearest: SceneInteraction | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const marker of this.markers) {
      if (!this.isInteractionUsable(marker.interaction)) continue;
      const distance = Vector3.Distance(playerPosition, marker.node.position);

      if (distance < 1.75 && distance < nearestDistance) {
        nearest = marker.interaction;
        nearestDistance = distance;
      }
    }

    if (nearest?.id !== this.nearest?.id) {
      this.nearest = nearest;
      this.callbacks.onNearestInteractionChange(nearest);
    }

    this.updateObjectiveHint(playerPosition);
  }

  private updateObjectiveHint(playerPosition: Vector3) {
    let objective: { node: TransformNode; interaction: SceneInteraction } | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const marker of this.markers) {
      if (!this.isInteractionActive(marker.interaction)) continue;
      if (!this.isInteractionUnlocked(marker.interaction)) continue;
      const distance = Vector3.Distance(playerPosition, marker.node.position);
      if (distance < nearestDistance) {
        objective = marker;
        nearestDistance = distance;
      }
    }

    const nextHint = objective ? this.createCameraRelativeHint(objective, playerPosition, nearestDistance) : null;

    if (!this.isSameHint(this.objectiveHint, nextHint)) {
      this.objectiveHint = nextHint;
      this.callbacks.onObjectiveHintChange(nextHint);
    }
  }

  private createCameraRelativeHint(
    objective: { node: TransformNode; interaction: SceneInteraction },
    playerPosition: Vector3,
    distance: number
  ): ObjectiveHint {
    const toObjective = objective.node.position.subtract(playerPosition);
    toObjective.y = 0;
    if (toObjective.lengthSquared() > 0) {
      toObjective.normalize();
    }

    const { forward, right } = this.player.getCameraBasis();
    const rightAmount = Vector3.Dot(toObjective, right);
    const forwardAmount = Vector3.Dot(toObjective, forward);

    return {
      label: objective.interaction.label,
      distance,
      angleRadians: Math.atan2(rightAmount, forwardAmount)
    };
  }

  private isSameHint(current: ObjectiveHint | null, next: ObjectiveHint | null) {
    if (!current || !next) return current === next;
    return (
      current.label === next.label &&
      Math.abs(current.distance - next.distance) < 0.25 &&
      Math.abs(current.angleRadians - next.angleRadians) < 0.08
    );
  }

  private setInteractionRingEnabled(node: TransformNode, enabled: boolean) {
    for (const mesh of node.getChildMeshes(false)) {
      if (this.isInteractionRing(mesh)) {
        mesh.setEnabled(enabled);
      }
      if (this.isStarVisual(mesh)) {
        mesh.setEnabled(enabled);
      }
    }
    for (const marker of this.getItemMarkers(node)) {
      marker.setEnabled(enabled);
    }
  }

  private animateInteractionMarks(deltaSeconds: number) {
    this.markerPulseTime += deltaSeconds * 2.6;
    const itemBob = Math.sin(this.markerPulseTime) * 0.035;
    const itemPulse = 1 + Math.sin(this.markerPulseTime) * 0.08;
    const ringPulse = 1 + Math.sin(this.markerPulseTime) * 0.06;
    const itemGlow = 0.08 + (Math.sin(this.markerPulseTime) + 1) * 0.08;

    for (const marker of this.markers) {
      if (!this.isInteractionVisible(marker.interaction)) continue;

      for (const ring of this.getInteractionRings(marker.node)) {
        const baseScale = Number(ring.metadata?.baseScale ?? 1);
        ring.scaling.setAll(baseScale * ringPulse);
      }

      if (marker.interaction.type !== "item") continue;

      for (const itemMarker of this.getItemMarkers(marker.node)) {
        const baseY = Number(itemMarker.metadata?.baseY ?? itemMarker.position.y);
        itemMarker.position.y = baseY + itemBob;
        itemMarker.scaling.setAll(itemPulse);
      }

      this.setItemHighlight(marker.node, itemGlow);
    }

    for (const marker of this.markers) {
      if (marker.interaction.type !== "item" || this.isInteractionVisible(marker.interaction)) continue;
      this.setItemHighlight(marker.node, 0);
    }

    for (const objectiveMarker of this.interiorObjectiveMarkers) {
      if (!objectiveMarker.node.isEnabled()) continue;
      for (const ring of this.getInteractionRings(objectiveMarker.node)) {
        const baseScale = Number(ring.metadata?.baseScale ?? 1);
        ring.scaling.setAll(baseScale * ringPulse);
      }
    }

    for (const star of this.getStarVisuals()) {
      if (!star.isEnabled()) continue;
      const baseScale = Number(star.metadata?.baseScale ?? 1);
      star.scaling.setAll(baseScale * (1 + Math.sin(this.markerPulseTime * 1.35) * 0.08));
      star.rotation.z += deltaSeconds * 0.28;
    }
  }

  private setItemHighlight(node: TransformNode, intensity: number) {
    for (const mesh of node.getChildMeshes(false)) {
      if (this.isInteractionRing(mesh) || this.isInteractionArrow(mesh) || this.isItemMarker(mesh)) continue;
      const material = mesh.material;
      if (!(material instanceof StandardMaterial)) continue;
      const baseGlow = material.metadata?.baseEmissiveColor as Color3 | undefined;
      if (!baseGlow) {
        material.metadata = {
          ...(material.metadata ?? {}),
          baseEmissiveColor: material.emissiveColor.clone()
        };
      }
      const base = (material.metadata?.baseEmissiveColor as Color3 | undefined) ?? Color3.Black();
      material.emissiveColor = base.add(new Color3(1, 0.84, 0.28).scale(intensity));
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

  private isStarVisual(node: TransformNode) {
    return Boolean(node.metadata?.isStarVisual);
  }

  private isStarVisualRoot(node: TransformNode) {
    return Boolean(node.metadata?.isStarVisualRoot);
  }

  private getStarVisuals() {
    const visuals: TransformNode[] = [];
    for (const marker of this.markers) {
      for (const child of marker.node.getChildTransformNodes(false)) {
        if (this.isStarVisualRoot(child)) visuals.push(child);
      }
    }
    return visuals;
  }

  private isInteractionArrow(node: TransformNode) {
    return Boolean(node.metadata?.isInteractionArrow) || node.name.toLowerCase().includes("arrow");
  }

  private getItemMarkers(node: TransformNode) {
    const markers: TransformNode[] = [];
    if (this.isItemMarker(node)) markers.push(node);
    for (const child of node.getChildTransformNodes(false)) {
      if (this.isItemMarker(child)) markers.push(child);
    }
    return markers;
  }

  private isItemMarker(node: TransformNode) {
    return Boolean(node.metadata?.isItemMarker);
  }

  private isInteractionActive(interaction: SceneInteraction) {
    if (this.activeInteractionIds.size === 0) return true;
    return (
      this.activeInteractionIds.has(`${interaction.type}:${interaction.targetId}`) ||
      this.activeInteractionIds.has(`give_item:${interaction.targetId}:${interaction.itemId ?? ""}`)
    );
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
    this.updateInteriorObjectiveMarkerVisibility();
  }

  private updateInteriorObjectiveMarkerVisibility() {
    const playerInteriorZoneId = this.getPlayerInteriorZoneId();
    for (const objectiveMarker of this.interiorObjectiveMarkers) {
      const hasHiddenInteriorTarget = this.markers.some(({ interaction }) =>
        interaction.interiorZoneId === objectiveMarker.zoneId &&
        this.isInteractionActive(interaction) &&
        this.isInteractionUnlocked(interaction) &&
        !this.isCollectedItemInteraction(interaction) &&
        playerInteriorZoneId !== objectiveMarker.zoneId
      );
      objectiveMarker.node.setEnabled(hasHiddenInteriorTarget);
    }
  }

  private isInteractionVisible(interaction: SceneInteraction) {
    if (!this.isInteractionActive(interaction)) return false;
    if (!this.isInteractionUnlocked(interaction)) return false;
    if (this.isCollectedItemInteraction(interaction)) return false;
    return this.isInteriorInteractionAvailable(interaction);
  }

  private isInteractionUnlocked(interaction: SceneInteraction) {
    if (interaction.id !== "star_guided_stable") return true;
    if (!this.worldStateIds.has("star_guiding_to_manger")) return true;
    return this.guidingStarProgress >= 1;
  }

  private isInteractionUsable(interaction: SceneInteraction) {
    return this.isInteractionVisible(interaction);
  }

  private isInteriorInteractionAvailable(interaction: SceneInteraction) {
    if (!interaction.interiorZoneId) return true;
    return this.getPlayerInteriorZoneId() === interaction.interiorZoneId;
  }

  private isCollectedItemInteraction(interaction: SceneInteraction) {
    return interaction.type === "item" && this.collectedItemIds.has(interaction.targetId);
  }

  private getPlayerInteriorZoneId() {
    const playerPosition = this.player.getPosition();
    const zone = this.interiorZones.find((candidate) =>
      this.isPositionInsideInteriorZone(playerPosition, candidate)
    );
    return zone?.id ?? null;
  }

  private isPositionInsideInteriorZone(position: Vector3, zone: InteriorZone) {
    return (
      position.x >= zone.minX &&
      position.x <= zone.maxX &&
      position.z >= zone.minZ &&
      position.z <= zone.maxZ
    );
  }

  private rotationToward(from: Vector3, to: Vector3) {
    return Math.atan2(to.x - from.x, to.z - from.z);
  }

  private lerp(from: number, to: number, amount: number) {
    return from + (to - from) * amount;
  }
}
