function drag (element) {
  console.log('drag')
  let dragging = false;
  let position = null;
  let dragElement = document.getElementById(element);
  dragElement.addEventListener('mousedown', e => {
    console.log('mousedown')
    dragging = true;
    position = [e.clientX, e.clientY];
  })

  document.addEventListener('mousemove', e => {
    console.log('mousemove')
    if (dragging === false) {
      return null;
    }

    const x = e.clientX;
    const y = e.clientY;
    const deltaX = x - position[0];
    const deltaY = y - position[1];
    const left = parseInt(dragElement.style.left || 0);
    const top = parseInt(dragElement.style.top || 0);
    dragElement.style.left = left + deltaX + 'px';
    dragElement.style.top = top + deltaY + 'px';
    position = [x, y];
  })

  document.addEventListener('mouseup', e => {
    console.log('mouseup')
    dragging = false
  })
}
