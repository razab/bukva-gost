const PictureExercise={
 mount({definition,svg,canvas,resetButton,setupSurface}){
  if(!definition)throw new Error('Unknown picture component');
  svg.innerHTML=WorksheetCatalog.renderPicture(definition);
  canvas.setAttribute('aria-label',`Дорисовать: ${definition.name}`);
  resetButton.setAttribute('aria-label',`Сбросить рисунок: ${definition.name}`);
  return setupSurface(canvas,definition.id,200,200,null,resetButton);
 }
};
