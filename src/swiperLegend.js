import Origo from 'Origo';

const SwiperLegend = function SwiperLegend(options = {
      showLayer: () =>{console.log('showLayer not defined')}
    }) {
  //Basics
  let target;
  let isShown = false;
  let touchMode;

  //Plugin specific
  let legendLayerContainer;
  let headerContainerEl;
  let contentContainerEl;

  const checkIcon = '#ic_check_circle_24px';
  const uncheckIcon = '#ic_radio_button_unchecked_24px';

  function isVisible() {
    return isShown;
  }

  function setSwiperLegendVisible(state) {
    isShown = state;
    if (isShown) {
      legendLayerContainer.classList.remove('hidden');
    } else {
      legendLayerContainer.classList.add('hidden');
    }
  }

  function makeElementDraggable(elm) {
    const elmnt = elm;
    let pos1 = 0;
    let pos2 = 0;
    let pos3 = 0;
    let pos4 = 0;
    function elementDrag(e) {
      e.preventDefault();
      // calculate the new cursor position:
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // set the element's new position:
      elmnt.style.top = `${elmnt.offsetTop - pos2}px`;
      elmnt.style.left = `${elmnt.offsetLeft - pos1}px`;
    }

    function closeDragElement() {
      /* stop moving when mouse button or touch is released: */
      document.onmouseup = null;
      document.onmousemove = null;
      document.ontouchend = null;
    }

    function dragMouseDown(e) {
      e.preventDefault();
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;

      document.ontouchstart = closeDragElement;
      document.ontouchmove = elementDrag;
    }

    if (document.getElementById(`${elmnt.id}-draggable`)) {
      /* if present, the header is where you move the DIV from: */
      document.getElementById(`${elmnt.id}-draggable`).onmousedown = dragMouseDown;
    } else {
      /* otherwise, move the DIV from anywhere inside the DIV: */
      elmnt.onmousedown = dragMouseDown;
    }
  }

  function resetLayerList(swiperLayersArray) {
    renderLayersList(swiperLayers);
  }

  function getCheckIcon(isChecked) {
    return isChecked 
      ? checkIcon 
      : uncheckIcon;
  }

  function renderLayersList(swiperLayersArray) {
    contentContainerEl.textContent = '';

    swiperLayersArray.forEach(swLayer => {
      const layer = swLayer.getLayer();
      const layerId = layer.get('name');
      const legendLayersListItem = document.createElement('li');
      legendLayersListItem.id = layerId;
      legendLayersListItem.className = `legend-list-item ${swLayer.inUse() ? 'disabled' : ''}`;
      
      const inSwiperUse = swLayer.inSwiperUse();
      
      const iconToShow = Origo.ui.Icon({
        icon: getCheckIcon(inSwiperUse),
        cls: `round small icon-smaller no-shrink checked-icon`,
        style: '',
        title: '',
      });
      const divName = Origo.ui.Element({
        cls: `text-smaller padding-x-small grow pointer no-select overflow-hidden`,
        innerHTML: layer.get('title') || layerId.replace('__swiper', '')
      });
      
      legendLayersListItem.innerHTML = `${divName.render()} ${iconToShow.render()}`;
      contentContainerEl.appendChild(legendLayersListItem);

      legendLayersListItem.addEventListener('click', () => {
        if (options.showLayer(layerId.replace('__swiper', ''))) {
          resetLayerList(swiperLayers);
        }
      });
    });
  }

  return Origo.ui.Component({
    name: 'swiperLegend',
    onInit() {},
    onAdd(evt) {
      let viewer = evt.target;
      touchMode = 'ontouchstart' in document.documentElement;
      target = `${viewer.getMain().getId()}`;
    },
    render(swiperLayersArray) {
      legendLayerContainer = document.createElement('div');
      legendLayerContainer.className = 'legend-layer-container';
      legendLayerContainer.classList.add('legend-layer-container', 'hidden');
      legendLayerContainer.id = 'legendLayerContainer';
      document.getElementById(target).appendChild(legendLayerContainer);

      contentContainerEl = document.createElement('ul');
      contentContainerEl.className = 'legend-list';

      headerContainerEl = document.createElement('div');
      headerContainerEl.className = 'legend-layer-header';
      headerContainerEl.innerHTML = 'Lager';
      headerContainerEl.id = `${legendLayerContainer.id}-draggable`;

      const legendCloseButton = document.createElement('div');
      legendCloseButton.className = 'legend-close-button';

      legendCloseButton.addEventListener('click', () => {
        setSwiperLegendVisible(false);
      });

      headerContainerEl.appendChild(legendCloseButton);
      legendLayerContainer.appendChild(headerContainerEl);
      legendLayerContainer.appendChild(contentContainerEl);

      makeElementDraggable(legendLayerContainer);
      renderLayersList(swiperLayersArray);
      this.dispatch('render');
    },
    setSwiperLegendVisible,
    resetLayerList,
    isVisible
  });
};

export default SwiperLegend;
