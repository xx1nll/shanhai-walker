export class InputManager {
  constructor(canvas, callbacks = {}) {
    this.keys = {};
    this.cameraYaw = Math.PI;
    this.cameraPitch = 0.15;
    this.isPointerLocked = false;
    this.callbacks = callbacks;
    this._jumpPressed = false;
    this._interactPressed = false;
    this.editorActive = false;
    this.islandPanelActive = false;

    window.addEventListener('keydown', (e) => {
      const wasDown = this.keys[e.code];
      this.keys[e.code] = true;

      if (e.code === 'KeyG' && !e.repeat) this.callbacks.onToggleGrid?.();
      if (e.code === 'KeyM' && !e.repeat) this.callbacks.onToggleMinimap?.();
      if (e.code === 'KeyF' && !e.repeat) this.callbacks.onToggleFly?.();
      if (e.code === 'KeyT' && !e.repeat) this.callbacks.onToggleEditor?.();
      if (e.code === 'KeyP' && !e.repeat) this.callbacks.onToggleIslandPanel?.();

      if (e.code === 'BracketLeft' && !e.repeat && !this.islandPanelActive) this.callbacks.onBrushResize?.(-2);
      if (e.code === 'BracketRight' && !e.repeat && !this.islandPanelActive) this.callbacks.onBrushResize?.(2);

      if (e.code === 'KeyE' && !wasDown && !this.editorActive) {
        this._interactPressed = true;
      }

      if (e.code === 'Space' && !wasDown) {
        this._jumpPressed = true;
      }

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    canvas.addEventListener('click', () => {
      if (this.editorActive || this.islandPanelActive) return;
      if (!this.isPointerLocked && !document.getElementById('loading-screen')?.classList.contains('hidden')) {
        return;
      }
      if (!this.isPointerLocked) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
      canvas.classList.toggle('locked', this.isPointerLocked);
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked || this.editorActive || this.islandPanelActive) return;
      this.cameraYaw -= e.movementX * 0.002;
      this.cameraPitch -= e.movementY * 0.002;
      this.cameraPitch = Math.max(-0.3, Math.min(1.2, this.cameraPitch));
    });
  }

  getMovementInput() {
    const input = {
      forward: this.keys['KeyW'] || this.keys['ArrowUp'],
      backward: this.keys['KeyS'] || this.keys['ArrowDown'],
      left: this.keys['KeyA'] || this.keys['ArrowLeft'],
      right: this.keys['KeyD'] || this.keys['ArrowRight'],
      sprint: this.keys['ShiftLeft'] || this.keys['ShiftRight'],
      jump: this.keys['Space'],
      jumpPressed: this._jumpPressed,
      interactPressed: this._interactPressed,
      ascend: this.keys['Space'],
      descend: this.keys['ControlLeft'] || this.keys['ControlRight'] || this.keys['KeyC'],
    };
    this._jumpPressed = false;
    this._interactPressed = false;
    return input;
  }
}
