import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // Very subtle bloom — only for sun glints and golden tree
  const bloom = new UnrealBloomPass(
    { x: window.innerWidth, y: window.innerHeight },
    0.12,
    0.4,
    0.92
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  return {
    composer,
    resize(w, h) {
      composer.setSize(w, h);
      bloom.resolution.set(w, h);
    },
  };
}
