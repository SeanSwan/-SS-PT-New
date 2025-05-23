import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

async function loadModel() {
  const model = await cocoSsd.load();
  return model;
}

async function detectObjects(model, video) {
  const predictions = await model.detect(video);
  return predictions;
}

export { loadModel, detectObjects };

// import * as cocoSsd from '@tensorflow-models/coco-ssd';
// import '@tensorflow/tfjs';

// async function loadModel() {
//   const model = await cocoSsd.load();
//   return model;
// }

// async function detectObjects(model, video) {
//   const predictions = await model.detect(video);
//   return predictions;
// }

// export { loadModel, detectObjects };