import {
  ArcRotateCamera,
  Color3,
  Constants,
  Mesh,
  Ray,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  TransformNode,
  Vector3
} from "@babylonjs/core";
import type { InputManager } from "../engine/InputManager";
import type { CollisionBox, MovementBounds } from "../physics/CollisionTypes";
import type { HumanoidAnimationParts } from "../visuals/LowPolyFactory";
import { LowPolyFactory } from "../visuals/LowPolyFactory";

export class PlayerController {
  private mesh: TransformNode;
  private camera: ArcRotateCamera;
  private occlusionOutlines: Array<{ source: Mesh; outline: Mesh }> = [];
  private readonly defaultCameraRadius = 12;
  private speed = 3.3;
  private cameraTurnSpeed = 2.4;
  private cameraTiltSpeed = 1.35;
  private radius = 0.22;
  private walkTime = 0;
  private bounds: MovementBounds = {
    minX: -13,
    maxX: 13,
    minZ: -13,
    maxZ: 13
  };
  private collisionBoxes: CollisionBox[] = [];

  constructor(
    private scene: Scene,
    private input: InputManager,
    startPosition = new Vector3(0, 0, -7)
  ) {
    const visuals = new LowPolyFactory(scene);
    this.mesh = visuals.createHumanoid({
      name: "player",
      position: startPosition,
      tunicColor: new Color3(0.19, 0.32, 0.46),
      headCoverColor: new Color3(0.73, 0.68, 0.58),
      scale: 0.56
    });

    this.camera = new ArcRotateCamera(
      "thirdPersonCamera",
      -Math.PI / 2,
      Math.PI / 3.4,
      this.defaultCameraRadius,
      this.mesh.position,
      scene
    );
    if (this.usesTouchControls()) {
      this.camera.lowerRadiusLimit = this.defaultCameraRadius;
      this.camera.upperRadiusLimit = this.defaultCameraRadius;
      this.camera.panningSensibility = 0;
    } else {
      this.camera.lowerRadiusLimit = 5.6;
      this.camera.upperRadiusLimit = 14;
      this.camera.attachControl(scene.getEngine().getRenderingCanvas(), true);
    }
    this.camera.lowerBetaLimit = Math.PI / 4.2;
    this.camera.upperBetaLimit = Math.PI / 2.25;
    this.camera.wheelPrecision = 75;
    this.camera.inertia = 0.72;
    scene.activeCamera = this.camera;

    this.createPlayerOcclusionOutline();
  }

  setCollision(collisionBoxes: CollisionBox[], bounds: MovementBounds) {
    this.collisionBoxes = collisionBoxes;
    this.bounds = bounds;
  }

  addToShadowGenerator(shadowGenerator: ShadowGenerator) {
    for (const mesh of this.mesh.getChildMeshes(false)) {
      if (mesh.metadata?.isPlayerOcclusionOverlay) continue;
      shadowGenerator.addShadowCaster(mesh);
    }
  }

  update(deltaSeconds: number) {
    this.updateCameraTurn(deltaSeconds);
    const movement = this.getCameraRelativeMovement();

    if (movement.lengthSquared() > 0) {
      movement.normalize().scaleInPlace(this.speed * deltaSeconds);
      this.moveWithCollision(movement);
      this.mesh.rotation.y = Math.atan2(movement.x, movement.z);
      this.animateWalk(deltaSeconds, true);
    } else {
      this.animateWalk(deltaSeconds, false);
    }

    this.syncPlayerOcclusionOutline();
    this.camera.target = Vector3.Lerp(this.camera.target, this.mesh.position, 0.18);
  }

  getPosition() {
    return this.mesh.position.clone();
  }

  getCameraBasis() {
    const forward = this.camera.target.subtract(this.camera.position);
    forward.y = 0;
    if (forward.lengthSquared() === 0) {
      forward.z = 1;
    }
    forward.normalize();

    return {
      forward,
      right: new Vector3(forward.z, 0, -forward.x).normalize()
    };
  }

  dispose() {
    this.camera.dispose();
    this.mesh.dispose();
  }

  private getCameraRelativeMovement() {
    const { forward, right } = this.getCameraBasis();
    const movement = new Vector3(0, 0, 0);
    const virtualMovement = this.input.getVirtualMovement();

    if (this.input.isPressed("moveForward")) movement.addInPlace(forward);
    if (this.input.isPressed("moveBackward")) movement.subtractInPlace(forward);
    if (this.input.isPressed("moveRight")) movement.addInPlace(right);
    if (this.input.isPressed("moveLeft")) movement.subtractInPlace(right);
    if (virtualMovement.y !== 0) movement.addInPlace(forward.scale(virtualMovement.y));
    if (virtualMovement.x !== 0) movement.addInPlace(right.scale(virtualMovement.x));

    return movement;
  }

  private updateCameraTurn(deltaSeconds: number) {
    const cameraTurn = this.input.getVirtualCameraTurn();
    if (cameraTurn.x === 0 && cameraTurn.y === 0) return;

    this.camera.alpha += cameraTurn.x * this.cameraTurnSpeed * deltaSeconds;
    this.camera.beta = this.clamp(
      this.camera.beta - cameraTurn.y * this.cameraTiltSpeed * deltaSeconds,
      this.camera.lowerBetaLimit ?? Math.PI / 4.2,
      this.camera.upperBetaLimit ?? Math.PI / 2.25
    );
  }

  private createPlayerOcclusionOutline() {
    this.scene.setRenderingAutoClearDepthStencil(1, false, false, false);

    const material = new StandardMaterial("playerOcclusionOutlineMaterial", this.scene);
    material.diffuseColor = new Color3(1, 0.84, 0.18);
    material.emissiveColor = new Color3(1, 0.62, 0.08);
    material.specularColor = Color3.Black();
    material.alpha = 0.42;
    material.disableColorWrite = false;
    material.disableDepthWrite = true;
    material.depthFunction = Constants.GREATER;
    material.zOffset = -2;

    for (const source of this.mesh.getChildMeshes(false)) {
      if (!(source instanceof Mesh)) continue;
      const outline = source.clone(`${source.name}OcclusionOutline`, this.mesh);
      if (!outline) continue;
      outline.material = material;
      outline.renderOutline = true;
      outline.outlineColor = new Color3(1, 0.86, 0.18);
      outline.outlineWidth = 0.035;
      outline.renderingGroupId = 1;
      outline.alwaysSelectAsActiveMesh = true;
      outline.isPickable = false;
      outline.metadata = { ...(outline.metadata ?? {}), isPlayerOcclusionOverlay: true };
      this.occlusionOutlines.push({ source, outline });
    }
    this.syncPlayerOcclusionOutline();
  }

  private syncPlayerOcclusionOutline() {
    for (const { source, outline } of this.occlusionOutlines) {
      outline.position.copyFrom(source.position);
      outline.rotation.copyFrom(source.rotation);
      outline.scaling.copyFrom(source.scaling);
      outline.setEnabled(source.isEnabled() && this.isSourceOccluded(source));
    }
  }

  private isSourceOccluded(source: Mesh) {
    source.computeWorldMatrix(true);
    const target = source.getBoundingInfo().boundingBox.centerWorld.clone();
    const toTarget = target.subtract(this.camera.position);
    const distance = toTarget.length();
    if (distance <= 0.001) return false;

    const ray = new Ray(this.camera.position, toTarget.normalize(), distance);
    const hit = this.scene.pickWithRay(
      ray,
      (mesh) =>
        mesh.isEnabled() &&
        mesh.isVisible &&
        mesh.isPickable &&
        Boolean(mesh.metadata?.isBuildingMesh) &&
        !mesh.metadata?.isBuildingRoof &&
        !this.isPlayerMesh(mesh) &&
        !mesh.metadata?.isPlayerOcclusionOverlay,
      false
    );

    return Boolean(hit?.hit && hit.distance !== undefined && hit.distance < distance - 0.12);
  }

  private isPlayerMesh(mesh: TransformNode) {
    let current: TransformNode | null = mesh;
    while (current) {
      if (current === this.mesh) return true;
      current = current.parent as TransformNode | null;
    }
    return false;
  }

  private moveWithCollision(movement: Vector3) {
    const nextX = this.mesh.position.clone();
    nextX.x += movement.x;
    if (this.canOccupy(nextX)) {
      this.mesh.position.x = nextX.x;
    }

    const nextZ = this.mesh.position.clone();
    nextZ.z += movement.z;
    if (this.canOccupy(nextZ)) {
      this.mesh.position.z = nextZ.z;
    }
  }

  private canOccupy(position: Vector3) {
    if (
      position.x < this.bounds.minX ||
      position.x > this.bounds.maxX ||
      position.z < this.bounds.minZ ||
      position.z > this.bounds.maxZ
    ) {
      return false;
    }

    return !this.collisionBoxes.some((box) => this.overlapsBox(position, box));
  }

  private overlapsBox(position: Vector3, box: CollisionBox) {
    return (
      position.x + this.radius > box.minX &&
      position.x - this.radius < box.maxX &&
      position.z + this.radius > box.minZ &&
      position.z - this.radius < box.maxZ
    );
  }

  private animateWalk(deltaSeconds: number, isMoving: boolean) {
    const parts = this.mesh.metadata?.humanoidParts as HumanoidAnimationParts | undefined;
    if (!parts) return;

    if (isMoving) {
      this.walkTime += deltaSeconds * 8;
    }

    const swing = isMoving ? Math.sin(this.walkTime) * 0.48 : 0;
    const returnSpeed = isMoving ? 1 : Math.min(1, deltaSeconds * 8);

    parts.leftArm.rotation.x = this.lerp(parts.leftArm.rotation.x, swing, returnSpeed);
    parts.rightArm.rotation.x = this.lerp(parts.rightArm.rotation.x, -swing, returnSpeed);
    parts.leftLeg.rotation.x = this.lerp(parts.leftLeg.rotation.x, -swing * 0.7, returnSpeed);
    parts.rightLeg.rotation.x = this.lerp(parts.rightLeg.rotation.x, swing * 0.7, returnSpeed);
  }

  private lerp(from: number, to: number, amount: number) {
    return from + (to - from) * amount;
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  private usesTouchControls() {
    return (
      window.matchMedia("(pointer: coarse), (hover: none)").matches ||
      navigator.maxTouchPoints > 0
    );
  }
}
