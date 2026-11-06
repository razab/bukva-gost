// Dedicated worker: no DOM, storage, grading, or input handlers.
importScripts('trace-feedback.js?v=54');
self.onmessage=event=>{const {id,mode,payload}=event.data;const work=TraceFeedback.steps(payload,mode);let result;do{result=work.next()}while(!result.done);self.postMessage({id,markup:result.value})};
