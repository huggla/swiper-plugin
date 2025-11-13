import Origo from 'Origo';
import ol_control_Swipe from 'ol-ext/control/Swipe';
import ol_interaction_Clip from 'ol-ext/interaction/Clip';
import SwiperLayer from './swiperLayer';
import SwiperLegend from './swiperLegend';
import ManipulateLayers from './manipulateLayers';
import { checkIsMobile } from './functions';

const Swiper = function Swiper({  circleRadius = 50,
                                  initialLayer = null,
                                  alwaysOnTop = false,
                                  initialControl = null,
                                  backgroundGroup = 'background',
                                  showLayerListOnStart = false,
                                  origoConfig = null,
                                  tooltips = {
                                    swiper: 'Swiper',
                                    swipeBetweenLayers: 'Split view',
                                    circleSwipe: 'Circle layer overlay',
                                    layerList: 'Layer list'
                                  }
                                } = {}) {
  let viewer;
  let map;
  let target;
  let touchMode;
  let _isMobile;
  let _visibleLeftLayer;
  let _visibleRightLayer;
  let _swLayers = {};
  let _switchingLayers = false;

  let buttonsContainer;
  let swiperControl;
  let circleControl;

  let isSwiperToolsOpen = false;
  let isSwiperVisible = false;
  let isCircleVisible = false;

  let nonSwiperLayers;
  let otherLayers; // this are other layers

  // tool options
  const circleRadiusOption = circleRadius;
  const defaultLayer = initialLayer || '';
  const defaultControl = initialControl;
  const backgroundGroupName = backgroundGroup;
  const layerListOpenOnStart = showLayerListOnStart;
  const swiperTooltip = tooltips.swiper;
  const swipeBetweenLayersTooltip = tooltips.swipeBetweenLayers;
  const circleSwipeTooltip = tooltips.circleSwipe;
  const layerListTooltip = tooltips.layerList;
  const origoConfigPath = origoConfig;

  // tool buttons
  let swiperMainButton;
  let swiperButton;
  let circleButton;
  let swiperLegendButton;
  let swiperLegend;

  // tool button containers
  let buttonsContainerEl;
  let swiperMainButtonEl;
  let swiperButtonEl;
  let circleButtonEl;
  let swiperLegendButtonEl;

  const LayerOnTopOfSwiperZindex = 10;

  function showMenuButtons() {
    swiperMainButtonEl.classList.add('active');
    swiperButtonEl.classList.remove('hidden');
    if (!_isMobile) {
      circleButtonEl.classList.remove('hidden');
    }
    swiperLegendButtonEl.classList.remove('hidden');
  }

  function hideMenuButtons() {
    swiperMainButtonEl.classList.remove('active');
    swiperButtonEl.classList.add('hidden');
    if (!_isMobile) {
      circleButtonEl.classList.add('hidden');
    }
    swiperLegendButtonEl.classList.add('hidden');
  }

  function findLayerToSwipe() {
    const keys = Object.keys(_swLayers);
    
    // setting right layer
    let visibleRightKeys = keys.filter(lk => _swLayers[lk].getLayer().get('visible'));
    if (visibleRightKeys.length > 0) {
      visibleRightKeys.forEach(visibleRightKey => {
        _visibleRightLayer = _swLayers[visibleRightKey].getLayer();
        _swLayers[visibleRightKey].setAsShownOnRight();
        console.log('right layer', _visibleRightLayer.get('name'))
      });
    }

    // setting left layer ... if old layer is in use => get a new one
    if (!_visibleLeftLayer || _swLayers[_visibleLeftLayer.get('name')].inUse()) {
      let visibleLeftKey = keys.find(lk => !_swLayers[lk].getLayer().get('visible'));
      _visibleLeftLayer = _swLayers[visibleLeftKey].getLayer();
      _swLayers[visibleLeftKey].setAsShown();
      console.log('left layer', _visibleLeftLayer.get('name'))
    }
  }

  function setIndexOfLayersOnTopOfSwiper(index) {
    // Skip if swiper layers always should be on top.
    if (alwaysOnTop) return;
    const layersOnTopOfSwiper = viewer.getLayers().filter(l => !l.get('isSwiperLayer') && !l.get('isUnderSwiper'));
    layersOnTopOfSwiper.forEach(l => {
      l.setZIndex(index);
    })
  }

  function getRightLayer() {
    let underSwiperLayers = viewer
      .getLayers()
      .filter(
        layer =>
          // only visible non-swiper layers that are beneath the swiper
          (layer.get('visible') && (layer.get('isUnderSwiper') || (layer.get('isSwiperLayer') && !layer.get('name').endsWith('__swiper'))))
      );
    return underSwiperLayers[underSwiperLayers.length - 1];
  }

  function setLayerLabels() {
    if (!swiperControl) return;
    
    const labelId = 'swiperLabel';
    const layerRight = getRightLayer();
    let label = document.getElementById(labelId);
    if (!label) {
      label = document.createElement('span');
    }
    const titleLeft = _visibleLeftLayer ? _visibleLeftLayer.get('title') : '';
    const titleRight = layerRight ? layerRight.get('title') : '';
    const nameLeft = _visibleLeftLayer ? _visibleLeftLayer.get('name').split('__')[0] : '';
    const nameRight = layerRight ? layerRight.get('name').split('__')[0] : '';
    label.setAttribute('id', labelId);
    label.setAttribute('label-left', titleLeft);
    label.setAttribute('label-right', titleRight);
    _isMobile && label.classList.add('mobile');

    label.classList.add('label');
    label.classList.remove('warn');
    if (nameLeft === nameRight) {
      label.classList.add('warn');
    }

    swiperControl.element.appendChild(label);
  }

  function enableSwiper() {
    let isNew = true;
    if (!swiperControl) {
      swiperControl = new ol_control_Swipe({
        orientation: _isMobile ? 'horizontal' : 'vertical',
      });
    } else {
      isNew = false;
    }

    map.addControl(swiperControl);

    if (isNew) {
      // adding right side
      findLayerToSwipe();
      // right
      if (_visibleRightLayer) {
        swiperControl.addLayer(_visibleRightLayer, true);
      }
      // left
      showLayerOnController(swiperControl, _visibleLeftLayer);
    }
    setLayerLabels();
    setSwiperVisible(true);

    swiperLegend.resetLayerList(_swLayers);
  }

  function enableCircle() {
    findLayerToSwipe();
    console.log('cirle - layer', _visibleLeftLayer.get('name'))
    circleControl = new ol_interaction_Clip({
      radius: circleRadiusOption || 100
    });
    showLayerOnController(circleControl, _visibleLeftLayer);
      
    map.addInteraction(circleControl);
    setCircleVisible(true);
    
    swiperLegend.resetLayerList(_swLayers);
  }

  function showLayerOnController(controller, layer, showLayer = true) {
    if (!controller) {
      return;
    }

    disableVisibilityEvent();
    const whatType = layer.get('type');
    if (whatType == 'GROUP') {
      var children = layer.get('layers');
      children.forEach(childLayer => {
        if (showLayer) {
          controller.removeLayer(childLayer);
          controller.addLayer(childLayer);
        } else {
          controller.removeLayer(childLayer);
        }
        
        childLayer.setVisible(showLayer);
      });
    }
    const layerId = layer.get('name');
    if (showLayer) {
      controller.removeLayer(layer);
      controller.addLayer(layer);
    } else {
      controller.removeLayer(layer);
    }
    
    layer.setVisible(showLayer);
    _swLayers[layerId].setAsShown(showLayer);
    enableVisibilityEvent();
    console.log(layerId, 'visibility', showLayer);
  }

  function disableSwiper() {
    if (!swiperControl) { 
      return;
    }

    map.removeControl(swiperControl);
    setSwiperVisible(false);
    
    showLayerOnController(swiperControl, _visibleLeftLayer, false);
    swiperControl = null;
    console.info('disabling swiper');
  }

  function disableCircle() {
    if (!circleControl) {
      return;
    }

    map.removeInteraction(circleControl);
    setCircleVisible(false);
    showLayerOnController(circleControl, _visibleLeftLayer, false);
    circleControl = null;
    console.info('disabling circle');
  }

  function disableVisibilityEvent() {
    _switchingLayers = true;
  }
  function enableVisibilityEvent() {
    _switchingLayers = false;
  }
  function isVisibilityEventEnabled() {
    return !_switchingLayers;
  }

  function setSwiperVisible(state) {
    if (state) {
      swiperButtonEl.classList.add('active');
    } else {
      swiperButtonEl.classList.remove('active');
    }
    isSwiperVisible = state;
  }

  function setCircleVisible(state) {
    if (state) {
      circleButtonEl.classList.add('active');
    } else {
      circleButtonEl.classList.remove('active');
    }
    isCircleVisible = state;
  }

  // get swiperlayers from config file in origo
  function findSwiperLayers(viewer) {
    nonSwiperLayers = viewer.getLayers().filter(layer => layer.get('isSwiperLayer')
      && layer.get('name').endsWith('__swiper'));
    return nonSwiperLayers;
  }

  // get swiperlayers from config file in origo
  function findNonSwiperLayers(viewer) {
    nonSwiperLayers = viewer.getLayers().filter(layer => !layer.get('name').endsWith('__swiper'));
    return nonSwiperLayers;
  }
  
  function resetSwiperLayer(layerId) {
    // remove old layer
    let oldLayer = _visibleLeftLayer;
  
    if (_swLayers[layerId].inUse()) {
      console.log('the layer ', layerId, 'is in use');
      return false;
    }

    const toBeSwiperLayer = _swLayers[layerId].getLayer();
    _visibleLeftLayer = toBeSwiperLayer;
    console.log('new left side - layer:', _swLayers[layerId].getName());

    // add new layer
    const selectedControl = swiperControl || circleControl;
    showLayerOnController(selectedControl, _visibleLeftLayer);
  
    if (oldLayer) {
      console.log('removing left side - layer', oldLayer.get('name'))
      showLayerOnController(selectedControl, oldLayer, false);
    }
    
    console.log('resetSwiperLayer - end');
    return true;
  }

  function areSwiperLayersCompromised(layerId, layerVisibility) {
    if (layerVisibility) { // turning on another layer, that is fine
      return false;
    }
    const givenLayers = viewer.getLayersByProperty('id', layerId);
    if (!givenLayers.length) {
      return false;
    }
    // if not a background layer => fine
    const backgroundGroup = backgroundGroupName;
    const layerGroup = givenLayers[0].get('group');
    if (layerGroup != backgroundGroup) {
      console.log('not background group')
      return false;
    }

    // turning off a layer, does that affect us?
    const keys = Object.keys(_swLayers);
    const layersInUse = keys.filter((key) => _swLayers[key].inUse());
    // if we have 2 on layers => we are good
    if (layersInUse.length == 2) {
      return false;
    }
    // ok, so we do not see all layers => lets see if there are at least 2 background layers on
    const visibleBackgroundLayers = viewer.getLayersByProperty('group', backgroundGroup);
    if (visibleBackgroundLayers.length == 2) {
      return false;
    }

    return true;
  }

  function anyRightLayerLeft() {
    const keys = Object.keys(_swLayers);
    const layerInUse = keys.find((key) => _swLayers[key].inRightSideUse());
    return layerInUse != null;
  }

  function caseRightAndLeftShowSameLayer(currentLayerId, currentVisibility) {
    // set hidden layer as notShown
    const currentSwLayer = _swLayers[currentLayerId];
    if (currentSwLayer && !currentVisibility) {
      currentSwLayer.setAsShown(false);
      if (anyRightLayerLeft()) {
        return;
      }
      // else panic
    } else {
      console.log("layer triggered but in a SwiperLayer", currentLayerId, currentVisibility);
      if (!areSwiperLayersCompromised(currentLayerId, currentVisibility)) {
        console.log('it does not compromise the existing swiper layers')
        if (currentSwLayer) {
          if (currentVisibility) {
            currentSwLayer.setAsShownOnRight(true);
            swiperControl.addLayer(currentSwLayer.getLayer(), true);
          } else {
            currentSwLayer.setAsShownOnRight(false);
            swiperControl.removeLayer(currentSwLayer.getLayer());
          }
        }
        return;
      }
      // else panic
    }

    // Get the visible layer
    const keys = Object.keys(_swLayers);
    const keyInUse = keys.find((key) => key != currentLayerId && _swLayers[key].inUse());
    console.log('layer in use:', keyInUse);
    const swRightLayer = _swLayers[keyInUse];
    const theRightLayer = swRightLayer.getLayer();

    // no magic => disable controllers
    disableCircle();
    disableSwiper();
    
    disableVisibilityEvent();
    theRightLayer.setVisible(false);
    theRightLayer.setVisible(true);
    enableVisibilityEvent();
    
    closeSwiperTool();
    // swiperLegend.resetLayerList(_swLayers);
    return;
  }

  function caseRightChangesLayer(layerId1, visibility1,
                                layerId2, visibility2) {

    // just update the visibility on the _layers
    if (_swLayers[layerId1]) {
      _swLayers[layerId1].setAsShownOnRight(visibility1);
      if (swiperControl) {
        if (visibility1) {
          swiperControl.addLayer(_swLayers[layerId1].getLayer(), true);
        } else {
          swiperControl.removeLayer(_swLayers[layerId1].getLayer());
        }
      }
    }
    if (_swLayers[layerId2]) {
      _swLayers[layerId2].setAsShownOnRight(visibility2);
      if (swiperControl) {
        if (visibility2) {
          swiperControl.addLayer(_swLayers[layerId2].getLayer(), true);
        } else {
          swiperControl.removeLayer(_swLayers[layerId2].getLayer());
        }
      }
    }
    swiperLegend.resetLayerList(_swLayers);
  }

  let _switchOuterLayersTimeout = null;
  let _memorySwitch = [];
  function doesChangeAffectLayerVisibility(visibilityChangeEvent) {
    setLayerLabels();

    if (!isVisibilityEventEnabled()) {
      return;
    }

    const layerId = visibilityChangeEvent.target.get('name');
    const currentVisibility = !visibilityChangeEvent.oldValue;
    console.log(layerId, 'visibility:', currentVisibility, new Date());
    _memorySwitch.push({ layerId, currentVisibility});

    if (_switchOuterLayersTimeout) {
      clearTimeout(_switchOuterLayersTimeout);
    }
    _switchOuterLayersTimeout = setTimeout( () => {
      console.log("got all", _memorySwitch.length, 'changes');
      whatTodoWithTheseVisibilityChanges(_memorySwitch);
      _memorySwitch = [];
      _switchOuterLayersTimeout = null;
    }, 100);
  }
  function whatTodoWithTheseVisibilityChanges(affectedVisibleLayers) {
    if (!affectedVisibleLayers || !affectedVisibleLayers.length) {
      log.console('why is the affectedVisibleLayers array empty?')
      return;
    }
    if (affectedVisibleLayers.length == 1) {
      const affected = affectedVisibleLayers.pop();
        caseRightAndLeftShowSameLayer(affected.layerId, affected.currentVisibility);
        return;
    }
    // 2 or more
    const firstValue = affectedVisibleLayers[0].currentVisibility;
    const accumulativeValue = affectedVisibleLayers.reduce((curr, accum) => {
      if (firstValue) {
        return curr && accum;
      } else {
        return curr || accum;
      }
    }, firstValue);
    // if they are all the same => they come from a group, so treat each one 
    // as if it was called individually 
    if (firstValue == accumulativeValue) {
      affectedVisibleLayers.forEach(mem => {
        caseRightAndLeftShowSameLayer(mem.layerId, mem.currentVisibility);
      });
    }
    // else 
    if (affectedVisibleLayers.length == 2) {
      var mem1 = affectedVisibleLayers.pop();
      var mem2 = affectedVisibleLayers.pop();
      caseRightChangesLayer(mem1.layerId, mem1.currentVisibility,
                            mem2.layerId, mem2.currentVisibility);
    }
    // if there is more than 2 and some are on and some off, then this is a strange situation 
    // which this plugin is not prepared to handled.
    // The least damaging thing is to handle it as if they are individual calls
    affectedVisibleLayers.forEach(mem => {
      caseRightAndLeftShowSameLayer(mem.layerId, mem.currentVisibility);
    });
  }
  
  function setSwiperLayers(layers) {
    layers.forEach(la => {
      const layerName = la.get('name');
      _swLayers[layerName] = new SwiperLayer(la, false, false);

      // setting the default layer
      if (layerName.replace('__swiper', '').toLowerCase() === defaultLayer.toLowerCase()) {
        console.log('default layer set:', defaultLayer);
        _visibleLeftLayer = la;
      }
    });
    return _swLayers;
  }

  function bindLayersListener() {
    const keys = Object.keys(_swLayers);
    keys.forEach(lk => {
      const layer = _swLayers[lk].getLayer();
      layer.on('change:visible', doesChangeAffectLayerVisibility);
    });

    // not swiper layers 
    if (!otherLayers) {
      otherLayers = findNonSwiperLayers(viewer);
    }
    otherLayers.forEach(la => {
      la.on('change:visible', doesChangeAffectLayerVisibility);
    });

  }

  function unBindLayersListener() {
    const keys = Object.keys(_swLayers);
    keys.forEach(lk => {
      const layer = _swLayers[lk].getLayer();
      layer.un('change:visible', doesChangeAffectLayerVisibility);
    });

    otherLayers.forEach(la => {
      la.un('change:visible', doesChangeAffectLayerVisibility);
    });
  }

  function setupLayers(viewer) {
    const swiperLayerObjects = viewer.getLayers().filter(l => 
      l.get('isSwiperLayer') && l.get('name').endsWith('__swiper')
    );
    if (swiperLayerObjects.length === 0) return false;

    let configPromise = Promise.resolve({ layers: [] });
    if (typeof origoConfigPath === 'string') {
      configPromise = fetch(origoConfigPath).then(r => r.json());
    } else if (origoConfigPath && origoConfigPath.layers) {
      configPromise = Promise.resolve(origoConfigPath);
    }

    return configPromise.then(config => {
      const orderedLayers = [];
      config.layers.forEach(layerConfig => {
        if (layerConfig.isSwiperLayer) {
          const nameWithSuffix = layerConfig.name + '__swiper';
          const layer = viewer.getLayer(nameWithSuffix);
          if (layer) orderedLayers.push(layer);
        }
      });

      const finalLayers = orderedLayers.length > 0 ? orderedLayers : swiperLayerObjects;

      _swLayers = {};
      finalLayers.forEach(la => {
        const layerName = la.get('name');
        _swLayers[layerName] = new SwiperLayer(la, false, false);
        if (layerName.replace('__swiper', '').toLowerCase() === defaultLayer.toLowerCase()) {
          _visibleLeftLayer = la;
        }
      });

      const orderedArray = finalLayers.map(l => _swLayers[l.get('name')]);
      setTimeout(() => swiperLegend.render(orderedArray), 0);

      return true;
    }).catch(err => {
      console.error('Swiper config error:', err);
      setSwiperLayers(swiperLayerObjects);
      return true;
    });
  }

  function closeSwiperTool() {
    setIndexOfLayersOnTopOfSwiper(0);
    disableCircle();
    disableSwiper();
    hideMenuButtons();
    swiperLegend.setSwiperLegendVisible(false);
    unBindLayersListener();
    isSwiperToolsOpen = false;
  }

  function addSvgIcons() {
    const svgIcons = `
    <svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
      <symbol id="mui-compare" viewBox="0 0 24 24">
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M10 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h5v2h2V1h-2v2zm0 15H5l5-6v6zm9-15h-5v2h5v13l-5-6v9h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
      </symbol>
      
      <symbol id="mui-circle" viewBox="0 0 24 24">
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2z"/>
      </symbol>
      
      <symbol id="mui-swap-vertical" viewBox="0 0 24 24">
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/>
      </symbol>
      
      <symbol id="mui-swap-horizontal" viewBox="0 0 24 24">
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>
      </symbol>
    </svg>
    `;
    const div = document.createElement('div');
    div.innerHTML = svgIcons;
    document.body.insertBefore(div, document.body.childNodes[0]);
  }

  return Origo.ui.Component({
    name: 'swiper',
    onInit() {
      _isMobile = checkIsMobile();
      addSvgIcons();
      swiperMainButton = Origo.ui.Button({
        cls: 'o-measure padding-small margin-bottom-smaller icon-smaller round light box-shadow no-round-icon swiper-tool-button',
        click() {
          if (isSwiperToolsOpen) {
            closeSwiperTool();
          } else {
            bindLayersListener();
            showMenuButtons();
            if (defaultControl) {
              const controlName = defaultControl.toLowerCase();
              if (controlName === 'swipe') {
                enableSwiper();
              }
              if (controlName === 'clip') {
                enableCircle();
              }
            }
            isSwiperToolsOpen = true;

            setIndexOfLayersOnTopOfSwiper(LayerOnTopOfSwiperZindex);
            swiperLegend.setSwiperLegendVisible(layerListOpenOnStart);
          }
        },
        icon: '#mui-compare',
        tooltipText: swiperTooltip,
        tooltipPlacement: 'east',
      });
      swiperButton = Origo.ui.Button({
        cls: 'o-measure padding-small margin-bottom-smaller icon-smaller round light box-shadow hidden swiper-button',
        click() {
          disableCircle();
          if (!isSwiperVisible) {
            enableSwiper();
          } else {
            // do nothing
            // disableSwiper();
          }
        },
        icon: _isMobile ? '#mui-swap-vertical' : '#mui-swap-horizontal',
        tooltipText: swipeBetweenLayersTooltip,
        tooltipPlacement: 'east',
      });
      if (!_isMobile) {
        circleButton = Origo.ui.Button({
          cls: 'o-measure padding-small margin-bottom-smaller icon-smaller round light box-shadow hidden',
          click() {
            disableSwiper();
            if (!isCircleVisible) {
              enableCircle();
            } else {
              // do nothing
              // disableCircle();
            }
          },
          icon: '#mui-circle',
          tooltipText: circleSwipeTooltip,
          tooltipPlacement: 'east',
        });
      }

      swiperLegend = SwiperLegend({showLayer: resetSwiperLayer});

      swiperLegendButton = Origo.ui.Button({
        cls: 'o-measure padding-small margin-bottom-smaller icon-smaller round light box-shadow hidden',
        click() {
          swiperLegend.setSwiperLegendVisible(!swiperLegend.isVisible());
        },
        icon: '#ic_layers_24px',
        tooltipText: layerListTooltip,
        tooltipPlacement: 'east',
      });

      buttonsContainer = Origo.ui.Element({
        tagName: 'div',
        cls: 'flex column',
      });
    },
    onAdd(evt) {
      viewer = evt.target;
      map = viewer.getMap();

      // Action plan:
      // 1. fetch all swiper layers
      // 2. Create a SwiperLayer class which will indicate layerName, visible, right, left, inUse (right or left?)
      // 3. Use the list<SwiperLayer> in the swiperLegend to populate it.
      // 4. Hook on any/all background layers for any change
      //    You hook up by listening on an event (shown in Markus chat)
      // 4.1 if change detected
      // 4.1.1 if it does not affect the left => just show it in the right, mark it as inUsed (right=true)
      //      and it should be disabled to select on the swiperLegend
      // 4.1.2 if affects left (is the same as left) => pick first in the SwiperLayer list which is not in Use and show it (mark it left=true)
      
      // if there is an origoPath => close the swiperLayers
      let promise = Promise.resolve();
      if (origoConfigPath) {
        promise = ManipulateLayers(viewer, origoConfigPath);
      }
      
      promise.then(res => {
        const isSetup = setupLayers(viewer);
        if (!isSetup) {
          console.log('No swiper layers defined. Tool will not be added to the map.');
          return;
        }
  
        touchMode = 'ontouchstart' in document.documentElement;
        target = `${viewer.getMain().getMapTools().getId()}`;
        let components = [swiperMainButton, swiperButton];
        if (!_isMobile) {
          components.push(circleButton);
        }
        components.push(swiperLegendButton);
        this.addComponents(components);
        viewer.addComponent(swiperLegend);
        this.render();
      });
    },
    render() {
      // Make an html fragment of buttonsContainer, add to DOM and sets DOM-node in module for easy access
      const buttonsContainerHtmlFragment = Origo.ui.dom.html(buttonsContainer.render());
      document.getElementById(target).appendChild(buttonsContainerHtmlFragment);
      buttonsContainerEl = document.getElementById(buttonsContainer.getId());

      // Adding main Swiper toggle button
      const mainButtonHtmlFragment = Origo.ui.dom.html(swiperMainButton.render());
      buttonsContainerEl.appendChild(mainButtonHtmlFragment);
      swiperMainButtonEl = document.getElementById(swiperMainButton.getId());

      // Adding Swiper toggle button
      const swiperButtonHtmlFragment = Origo.ui.dom.html(swiperButton.render());
      buttonsContainerEl.appendChild(swiperButtonHtmlFragment);
      swiperButtonEl = document.getElementById(swiperButton.getId());

      if (!_isMobile) {
        // Adding Circle toogle button
        const modeButtonHtmlFragment = Origo.ui.dom.html(circleButton.render());
        buttonsContainerEl.appendChild(modeButtonHtmlFragment);
        circleButtonEl = document.getElementById(circleButton.getId());
      }

      // Adding the layer list button
      const swiperLegendButtonHtmlFragment = Origo.ui.dom.html(swiperLegendButton.render());
      buttonsContainerEl.appendChild(swiperLegendButtonHtmlFragment);
      swiperLegendButtonEl = document.getElementById(swiperLegendButton.getId());

      swiperLegendButton.dispatch('render');
      this.dispatch('render');
    },
  });
};

export default Swiper;
