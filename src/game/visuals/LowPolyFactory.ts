import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3
} from "@babylonjs/core";

export type HumanoidAnimationParts = {
  leftArm: TransformNode;
  rightArm: TransformNode;
  leftLeg: TransformNode;
  rightLeg: TransformNode;
};

export type HumanoidOptions = {
  name: string;
  position: Vector3;
  tunicColor: Color3;
  skinColor?: Color3;
  headCoverColor?: Color3;
  scale?: number;
};

export type BuildingOptions = {
  name: string;
  position: Vector3;
  size: Vector3;
  wallColor: Color3;
  floorColor?: Color3;
};

export type BuildingVisual = {
  root: TransformNode;
  roof: Mesh;
  roofMaterial: StandardMaterial;
};

export class LowPolyFactory {
  constructor(private scene: Scene) {}

  createHumanoid(options: HumanoidOptions) {
    const scale = options.scale ?? 1;
    const root = new TransformNode(options.name, this.scene);
    root.position = options.position.clone();
    root.scaling = new Vector3(scale, scale, scale);
    const parts: Partial<HumanoidAnimationParts> = {};

    const skin = this.material(`${options.name}Skin`, options.skinColor ?? new Color3(0.62, 0.42, 0.27));
    const tunic = this.material(`${options.name}Tunic`, options.tunicColor);
    const cover = this.material(
      `${options.name}HeadCover`,
      options.headCoverColor ?? options.tunicColor.scale(0.72)
    );
    const sandal = this.material(`${options.name}Sandal`, new Color3(0.18, 0.11, 0.07));

    const body = MeshBuilder.CreateCylinder(
      `${options.name}Body`,
      { height: 0.9, diameterTop: 0.55, diameterBottom: 0.68, tessellation: 6 },
      this.scene
    );
    body.position = new Vector3(0, 0.85, 0);
    body.material = tunic;
    body.parent = root;

    const head = MeshBuilder.CreateSphere(
      `${options.name}Head`,
      { diameter: 0.42, segments: 8 },
      this.scene
    );
    head.position = new Vector3(0, 1.48, 0);
    head.material = skin;
    head.parent = root;

    const headCover = MeshBuilder.CreateCylinder(
      `${options.name}HeadCover`,
      { height: 0.16, diameterTop: 0.32, diameterBottom: 0.46, tessellation: 8 },
      this.scene
    );
    headCover.position = new Vector3(0, 1.66, 0);
    headCover.material = cover;
    headCover.parent = root;

    for (const side of [-1, 1]) {
      const arm = MeshBuilder.CreateCylinder(
        `${options.name}Arm${side}`,
        { height: 0.62, diameter: 0.13, tessellation: 6 },
        this.scene
      );
      arm.position = new Vector3(side * 0.42, 0.85, 0);
      arm.rotation.z = side * 0.18;
      arm.material = skin;
      arm.parent = root;
      if (side < 0) parts.leftArm = arm;
      else parts.rightArm = arm;

      const leg = MeshBuilder.CreateCylinder(
        `${options.name}Leg${side}`,
        { height: 0.55, diameter: 0.16, tessellation: 6 },
        this.scene
      );
      leg.position = new Vector3(side * 0.17, 0.28, 0);
      leg.material = sandal;
      leg.parent = root;
      if (side < 0) parts.leftLeg = leg;
      else parts.rightLeg = leg;
    }

    root.metadata = {
      ...(root.metadata ?? {}),
      humanoidParts: parts,
      visualHeight: 1.74 * scale,
      interactionAnchorHeight: 1.74 * scale
    };

    return root;
  }

  createInteractionRing(name: string, position: Vector3, color: Color3, diameter = 1.15) {
    const ring = MeshBuilder.CreateTorus(
      name,
      { diameter, thickness: 0.045, tessellation: 24 },
      this.scene
    );
    ring.position = position.clone();
    ring.position.y = 0.11;
    const material = this.material(`${name}Material`, color);
    material.alpha = 0.68;
    material.emissiveColor = color.scale(0.32);
    material.zOffset = -1;
    ring.material = material;
    ring.alwaysSelectAsActiveMesh = true;
    ring.metadata = {
      ...(ring.metadata ?? {}),
      isInteractionRing: true,
      baseScale: ring.scaling.x
    };
    return ring;
  }

  createInteractionArrow(name: string, position: Vector3, color: Color3, height = 1.55) {
    const root = new TransformNode(name, this.scene);
    root.position = position.clone();
    // `height` is the local Y position of the arrow tip. All marker geometry sits above it,
    // so the marker cannot visually pierce the target when the anchor height is correct.
    root.position.y += height;

    const material = this.material(`${name}Material`, color);
    material.alpha = 0.92;
    material.emissiveColor = color.scale(0.45);

    const head = MeshBuilder.CreateCylinder(
      `${name}Head`,
      { height: 0.24, diameterTop: 0.34, diameterBottom: 0, tessellation: 4 },
      this.scene
    );
    head.position = new Vector3(0, 0.12, 0);
    head.rotation.y = Math.PI / 4;
    head.material = material;
    head.parent = root;

    root.metadata = {
      ...(root.metadata ?? {}),
      isInteractionArrow: true,
      baseY: root.position.y
    };

    return root;
  }

  createItemMarker(name: string, position: Vector3) {
    const root = new TransformNode(name, this.scene);
    root.position = position.clone();

    const markerColor = new Color3(1, 0.91, 0.34);
    const material = this.material(`${name}Material`, markerColor);
    material.emissiveColor = markerColor.scale(0.72);

    const left = MeshBuilder.CreateBox(
      `${name}ChevronLeft`,
      { width: 0.34, height: 0.055, depth: 0.09 },
      this.scene
    );
    left.position = new Vector3(-0.11, 0, 0);
    left.rotation.y = -0.62;
    left.material = material;
    left.metadata = { ...(left.metadata ?? {}), isItemMarker: true };
    left.parent = root;

    const right = MeshBuilder.CreateBox(
      `${name}ChevronRight`,
      { width: 0.34, height: 0.055, depth: 0.09 },
      this.scene
    );
    right.position = new Vector3(0.11, 0, 0);
    right.rotation.y = 0.62;
    right.material = material;
    right.metadata = { ...(right.metadata ?? {}), isItemMarker: true };
    right.parent = root;

    const dot = MeshBuilder.CreateCylinder(
      `${name}Dot`,
      { height: 0.035, diameter: 0.12, tessellation: 12 },
      this.scene
    );
    dot.position = new Vector3(0, -0.08, 0.16);
    dot.material = material;
    dot.metadata = { ...(dot.metadata ?? {}), isItemMarker: true };
    dot.parent = root;

    root.metadata = {
      ...(root.metadata ?? {}),
      isItemMarker: true,
      baseY: root.position.y
    };

    return root;
  }

  createBlanketBundle(name: string, position: Vector3, color: Color3) {
    const root = new TransformNode(name, this.scene);
    root.position = position.clone();

    const fabric = this.material(`${name}Fabric`, color);
    const strap = this.material(`${name}Strap`, new Color3(0.25, 0.14, 0.08));

    const roll = MeshBuilder.CreateCylinder(
      `${name}Roll`,
      { height: 0.85, diameter: 0.28, tessellation: 8 },
      this.scene
    );
    roll.rotation.z = Math.PI / 2;
    roll.position = new Vector3(0, 0.18, 0);
    roll.material = fabric;
    roll.parent = root;

    for (const x of [-0.22, 0.22]) {
      const band = MeshBuilder.CreateBox(
        `${name}Band${x}`,
        { width: 0.06, height: 0.34, depth: 0.34 },
        this.scene
      );
      band.position = new Vector3(x, 0.18, 0);
      band.material = strap;
      band.parent = root;
    }

    root.metadata = {
      ...(root.metadata ?? {}),
      visualHeight: 0.36,
      interactionAnchorHeight: 0.36
    };

    return root;
  }

  createSpreadBlanket(name: string, position: Vector3, color: Color3) {
    const root = new TransformNode(name, this.scene);
    root.position = position.clone();

    const fabric = this.material(`${name}Fabric`, color);
    const edge = this.material(`${name}Edge`, color.scale(0.78));
    const fold = this.material(`${name}Fold`, color.scale(0.88));

    const blanket = MeshBuilder.CreateBox(
      `${name}Surface`,
      { width: 1.55, height: 0.045, depth: 1.05 },
      this.scene
    );
    blanket.position = new Vector3(0, 0.08, 0);
    blanket.material = fabric;
    blanket.parent = root;

    for (const z of [-0.49, 0.49]) {
      const border = MeshBuilder.CreateBox(
        `${name}Border${z}`,
        { width: 1.55, height: 0.055, depth: 0.06 },
        this.scene
      );
      border.position = new Vector3(0, 0.12, z);
      border.material = edge;
      border.parent = root;
    }

    for (const x of [-0.72, 0.72]) {
      const border = MeshBuilder.CreateBox(
        `${name}SideBorder${x}`,
        { width: 0.06, height: 0.055, depth: 1.05 },
        this.scene
      );
      border.position = new Vector3(x, 0.12, 0);
      border.material = edge;
      border.parent = root;
    }

    for (const x of [-0.28, 0.28]) {
      const crease = MeshBuilder.CreateBox(
        `${name}Crease${x}`,
        { width: 0.035, height: 0.025, depth: 0.86 },
        this.scene
      );
      crease.position = new Vector3(x, 0.14, 0);
      crease.material = fold;
      crease.parent = root;
    }

    root.metadata = {
      ...(root.metadata ?? {}),
      visualHeight: 0.16,
      interactionAnchorHeight: 0.16
    };

    return root;
  }

  createBuilding(options: BuildingOptions): BuildingVisual {
    const root = new TransformNode(options.name, this.scene);
    const wall = this.material(`${options.name}WallMaterial`, options.wallColor);
    const floor = this.material(
      `${options.name}FloorMaterial`,
      options.floorColor ?? new Color3(0.64, 0.49, 0.31)
    );
    const dark = this.material(`${options.name}DoorMaterial`, new Color3(0.15, 0.09, 0.05));
    const roofMaterial = this.material(`${options.name}RoofMaterial`, options.wallColor.scale(0.82));

    const width = options.size.x;
    const height = options.size.y;
    const depth = options.size.z;
    const thickness = 0.18;
    const doorWidth = Math.min(1.2, width * 0.32);
    const center = options.position;
    const floorY = 0.035;

    const floorMesh = MeshBuilder.CreateBox(
      `${options.name}Floor`,
      { width, height: 0.07, depth },
      this.scene
    );
    floorMesh.position = new Vector3(center.x, floorY, center.z);
    floorMesh.material = floor;
    floorMesh.metadata = { ...(floorMesh.metadata ?? {}), isBuildingMesh: true };
    floorMesh.parent = root;

    const roof = MeshBuilder.CreateBox(
      `${options.name}FlatRoof`,
      { width: width + 0.2, height: 0.12, depth: depth + 0.2 },
      this.scene
    );
    roof.position = new Vector3(center.x, height + 0.08, center.z);
    roof.material = roofMaterial;
    roof.metadata = { ...(roof.metadata ?? {}), isBuildingMesh: true };
    roof.parent = root;

    this.createWall(`${options.name}BackWall`, new Vector3(center.x, height / 2, center.z + depth / 2), width, height, thickness, wall, root);
    this.createWall(`${options.name}LeftWall`, new Vector3(center.x - width / 2, height / 2, center.z), thickness, height, depth, wall, root);
    this.createWall(`${options.name}RightWall`, new Vector3(center.x + width / 2, height / 2, center.z), thickness, height, depth, wall, root);

    const frontSegmentWidth = (width - doorWidth) / 2;
    this.createWall(
      `${options.name}FrontLeftWall`,
      new Vector3(center.x - doorWidth / 2 - frontSegmentWidth / 2, height / 2, center.z - depth / 2),
      frontSegmentWidth,
      height,
      thickness,
      wall,
      root
    );
    this.createWall(
      `${options.name}FrontRightWall`,
      new Vector3(center.x + doorWidth / 2 + frontSegmentWidth / 2, height / 2, center.z - depth / 2),
      frontSegmentWidth,
      height,
      thickness,
      wall,
      root
    );

    const doorMat = MeshBuilder.CreateBox(
      `${options.name}DoorMat`,
      { width: doorWidth * 0.78, height: 0.04, depth: 0.55 },
      this.scene
    );
    doorMat.position = new Vector3(center.x, 0.07, center.z - depth / 2 - 0.18);
    doorMat.material = dark;
    doorMat.metadata = { ...(doorMat.metadata ?? {}), isBuildingMesh: true };
    doorMat.parent = root;

    const parapetColor = options.wallColor.scale(0.72);
    const parapet = this.material(`${options.name}ParapetMaterial`, parapetColor);
    this.createWall(`${options.name}BackParapet`, new Vector3(center.x, height + 0.18, center.z + depth / 2), width + 0.25, 0.28, thickness, parapet, root);
    this.createWall(`${options.name}LeftParapet`, new Vector3(center.x - width / 2, height + 0.18, center.z), thickness, 0.28, depth + 0.25, parapet, root);
    this.createWall(`${options.name}RightParapet`, new Vector3(center.x + width / 2, height + 0.18, center.z), thickness, 0.28, depth + 0.25, parapet, root);
    this.createWall(`${options.name}FrontParapet`, new Vector3(center.x, height + 0.18, center.z - depth / 2), width + 0.25, 0.28, thickness, parapet, root);

    this.createInteriorTable(`${options.name}Table`, new Vector3(center.x + width * 0.18, 0.32, center.z + depth * 0.12), root);

    return { root, roof, roofMaterial };
  }

  private createWall(
    name: string,
    position: Vector3,
    width: number,
    height: number,
    depth: number,
    material: StandardMaterial,
    parent: TransformNode
  ) {
    const wall = MeshBuilder.CreateBox(name, { width, height, depth }, this.scene);
    wall.position = position;
    wall.material = material;
    wall.metadata = { ...(wall.metadata ?? {}), isBuildingMesh: true };
    wall.parent = parent;
    return wall;
  }

  private createInteriorTable(name: string, position: Vector3, parent: TransformNode) {
    const material = this.material(`${name}Material`, new Color3(0.32, 0.2, 0.1));
    const top = MeshBuilder.CreateBox(`${name}Top`, { width: 0.8, height: 0.09, depth: 0.45 }, this.scene);
    top.position = position;
    top.material = material;
    top.parent = parent;

    for (const x of [-0.27, 0.27]) {
      for (const z of [-0.13, 0.13]) {
        const leg = MeshBuilder.CreateBox(`${name}Leg${x}${z}`, { width: 0.08, height: 0.45, depth: 0.08 }, this.scene);
        leg.position = new Vector3(position.x + x, 0.16, position.z + z);
        leg.material = material;
        leg.parent = parent;
      }
    }
  }

  createCrate(name: string, position: Vector3) {
    const crate = MeshBuilder.CreateBox(name, { width: 0.75, height: 0.55, depth: 0.75 }, this.scene);
    crate.position = position.clone();
    crate.position.y += 0.275;
    crate.material = this.material(`${name}Material`, new Color3(0.39, 0.24, 0.11));
    return crate;
  }

  createFence(name: string, start: Vector3, count: number, spacing: number) {
    const root = new TransformNode(name, this.scene);
    const material = this.material(`${name}Material`, new Color3(0.29, 0.18, 0.09));

    for (let index = 0; index < count; index += 1) {
      const post = MeshBuilder.CreateBox(
        `${name}Post${index}`,
        { width: 0.12, height: 0.7, depth: 0.12 },
        this.scene
      );
      post.position = new Vector3(start.x + index * spacing, 0.35, start.z);
      post.material = material;
      post.parent = root;
    }

    const rail = MeshBuilder.CreateBox(
      `${name}Rail`,
      { width: Math.max(0.1, (count - 1) * spacing), height: 0.1, depth: 0.1 },
      this.scene
    );
    rail.position = new Vector3(start.x + ((count - 1) * spacing) / 2, 0.52, start.z);
    rail.material = material;
    rail.parent = root;

    return root;
  }

  createOliveTree(name: string, position: Vector3, scale = 1) {
    const root = new TransformNode(name, this.scene);
    root.position = position.clone();
    root.scaling = new Vector3(scale, scale, scale);

    const trunkMaterial = this.material(`${name}TrunkMaterial`, new Color3(0.34, 0.22, 0.12));
    const leafMaterial = this.material(`${name}LeafMaterial`, new Color3(0.32, 0.48, 0.28));
    const leafDarkMaterial = this.material(`${name}LeafDarkMaterial`, new Color3(0.23, 0.38, 0.22));

    const trunk = MeshBuilder.CreateCylinder(
      `${name}Trunk`,
      { height: 1.05, diameterTop: 0.18, diameterBottom: 0.26, tessellation: 6 },
      this.scene
    );
    trunk.position = new Vector3(0, 0.52, 0);
    trunk.rotation.z = 0.08;
    trunk.material = trunkMaterial;
    trunk.parent = root;

    const clusters = [
      { position: new Vector3(-0.24, 1.12, 0.03), diameter: 0.72, material: leafMaterial },
      { position: new Vector3(0.2, 1.28, -0.08), diameter: 0.66, material: leafDarkMaterial },
      { position: new Vector3(0.05, 1.48, 0.13), diameter: 0.58, material: leafMaterial }
    ];

    for (const [index, cluster] of clusters.entries()) {
      const leaf = MeshBuilder.CreateSphere(
        `${name}Leaf${index}`,
        { diameter: cluster.diameter, segments: 6 },
        this.scene
      );
      leaf.position = cluster.position;
      leaf.scaling.y = 0.78;
      leaf.material = cluster.material;
      leaf.parent = root;
    }

    return root;
  }

  createPalmTree(name: string, position: Vector3, scale = 1) {
    const root = new TransformNode(name, this.scene);
    root.position = position.clone();
    root.scaling = new Vector3(scale, scale, scale);

    const trunkMaterial = this.material(`${name}TrunkMaterial`, new Color3(0.43, 0.27, 0.13));
    const frondMaterial = this.material(`${name}FrondMaterial`, new Color3(0.28, 0.48, 0.22));

    const trunk = MeshBuilder.CreateCylinder(
      `${name}Trunk`,
      { height: 1.65, diameterTop: 0.16, diameterBottom: 0.28, tessellation: 7 },
      this.scene
    );
    trunk.position = new Vector3(0, 0.82, 0);
    trunk.rotation.z = -0.06;
    trunk.material = trunkMaterial;
    trunk.parent = root;

    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      const frond = MeshBuilder.CreateBox(
        `${name}Frond${index}`,
        { width: 0.16, height: 0.05, depth: 0.82 },
        this.scene
      );
      frond.position = new Vector3(Math.sin(angle) * 0.2, 1.72, Math.cos(angle) * 0.2);
      frond.rotation.y = angle;
      frond.rotation.x = 0.34;
      frond.material = frondMaterial;
      frond.parent = root;
    }

    return root;
  }

  createRock(name: string, position: Vector3, scale = 1) {
    const rock = MeshBuilder.CreatePolyhedron(
      name,
      { type: 1, size: 0.55 * scale },
      this.scene
    );
    rock.position = position.clone();
    rock.position.y += 0.22 * scale;
    rock.scaling = new Vector3(1.25, 0.62, 0.9);
    rock.rotation.y = (position.x + position.z) * 0.31;
    rock.material = this.material(`${name}Material`, new Color3(0.45, 0.39, 0.32));
    return rock;
  }

  createSheep(name: string, position: Vector3, scale = 1) {
    const root = new TransformNode(name, this.scene);
    root.position = position.clone();
    root.scaling = new Vector3(scale, scale, scale);

    const wool = this.material(`${name}WoolMaterial`, new Color3(0.86, 0.8, 0.66));
    const woolShade = this.material(`${name}WoolShadeMaterial`, new Color3(0.74, 0.68, 0.55));
    const face = this.material(`${name}FaceMaterial`, new Color3(0.34, 0.25, 0.18));
    const hoof = this.material(`${name}HoofMaterial`, new Color3(0.16, 0.11, 0.08));

    const body = MeshBuilder.CreateSphere(
      `${name}Body`,
      { diameter: 0.72, segments: 8 },
      this.scene
    );
    body.position = new Vector3(0, 0.42, 0);
    body.scaling = new Vector3(1.2, 0.72, 0.82);
    body.material = wool;
    body.parent = root;

    for (const [index, offset] of [
      new Vector3(-0.22, 0.55, -0.16),
      new Vector3(0, 0.62, 0.12),
      new Vector3(0.24, 0.5, -0.02)
    ].entries()) {
      const puff = MeshBuilder.CreateSphere(
        `${name}WoolPuff${index}`,
        { diameter: 0.38, segments: 6 },
        this.scene
      );
      puff.position = offset;
      puff.scaling.y = 0.72;
      puff.material = index % 2 === 0 ? wool : woolShade;
      puff.parent = root;
    }

    const head = MeshBuilder.CreateSphere(
      `${name}Head`,
      { diameter: 0.32, segments: 7 },
      this.scene
    );
    head.position = new Vector3(0.48, 0.48, 0);
    head.scaling = new Vector3(0.78, 0.9, 0.72);
    head.material = face;
    head.parent = root;

    const cap = MeshBuilder.CreateSphere(
      `${name}HeadWool`,
      { diameter: 0.28, segments: 6 },
      this.scene
    );
    cap.position = new Vector3(0.42, 0.64, 0);
    cap.scaling = new Vector3(0.9, 0.56, 0.78);
    cap.material = wool;
    cap.parent = root;

    for (const [index, offset] of [
      new Vector3(-0.24, 0.15, -0.18),
      new Vector3(-0.24, 0.15, 0.18),
      new Vector3(0.25, 0.15, -0.18),
      new Vector3(0.25, 0.15, 0.18)
    ].entries()) {
      const leg = MeshBuilder.CreateCylinder(
        `${name}Leg${index}`,
        { height: 0.3, diameter: 0.07, tessellation: 5 },
        this.scene
      );
      leg.position = offset;
      leg.material = hoof;
      leg.parent = root;
    }

    const tail = MeshBuilder.CreateSphere(
      `${name}Tail`,
      { diameter: 0.18, segments: 5 },
      this.scene
    );
    tail.position = new Vector3(-0.48, 0.47, 0);
    tail.material = woolShade;
    tail.parent = root;

    root.metadata = {
      ...(root.metadata ?? {}),
      visualHeight: 0.85 * scale
    };

    return root;
  }

  createPebbleCluster(name: string, position: Vector3, count = 5) {
    const root = new TransformNode(name, this.scene);
    root.position = position.clone();
    const material = this.material(`${name}Material`, new Color3(0.57, 0.5, 0.4));

    for (let index = 0; index < count; index += 1) {
      const offsetX = Math.sin(index * 1.9) * 0.42;
      const offsetZ = Math.cos(index * 2.3) * 0.28;
      const size = 0.08 + (index % 3) * 0.025;
      const pebble = MeshBuilder.CreatePolyhedron(
        `${name}Pebble${index}`,
        { type: 1, size },
        this.scene
      );
      pebble.position = new Vector3(offsetX, 0.04, offsetZ);
      pebble.scaling.y = 0.35;
      pebble.rotation.y = index * 0.7;
      pebble.material = material;
      pebble.parent = root;
    }

    return root;
  }

  createScrub(name: string, position: Vector3, scale = 1) {
    const root = new TransformNode(name, this.scene);
    root.position = position.clone();
    root.scaling = new Vector3(scale, scale, scale);
    const material = this.material(`${name}Material`, new Color3(0.39, 0.45, 0.25));

    for (const [index, offset] of [
      new Vector3(-0.12, 0.13, 0),
      new Vector3(0.12, 0.14, 0.05),
      new Vector3(0, 0.2, -0.1)
    ].entries()) {
      const clump = MeshBuilder.CreateSphere(
        `${name}Clump${index}`,
        { diameter: 0.36, segments: 6 },
        this.scene
      );
      clump.position = offset;
      clump.scaling.y = 0.55;
      clump.material = material;
      clump.parent = root;
    }

    return root;
  }

  material(name: string, color: Color3) {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = color;
    material.specularColor = Color3.Black();
    return material;
  }
}
