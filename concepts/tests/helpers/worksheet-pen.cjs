// Send pen contacts through the worksheet's input callbacks in the DOM fixture.
module.exports = function draw(canvas, strokes) {
 const frame = JSON.parse(canvas.attrs['data-view-box']);
 const rect = canvas.getBoundingClientRect();
 for (const stroke of strokes) {
  const points = stroke.map(([x, y]) => [
   rect.left + (x - frame.x) * rect.width / frame.width,
   rect.top + (y - frame.y) * rect.height / frame.height
  ]);
  for (const [event, samples] of [
   ['pointerdown', points.slice(0, 1)],
   ['pointermove', points.slice(1, -1)],
   ['pointerup', points.slice(-1)]
  ]) {
   for (const [clientX, clientY] of samples) {
    for (const handler of canvas.handlers[event] || []) {
     handler({pointerId: 1, pointerType: 'pen', button: 0, isPrimary: true, clientX, clientY, preventDefault() {}});
    }
   }
  }
 }
};
