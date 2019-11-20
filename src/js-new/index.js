(function () {
  let myListener = new Listener();
  let myRadio = new Radio({
    onConnected: onConnected,
    onAdded: onAdded,
    onRemoved: onRemoved,
    onLeft: onLeft,
    onJoined: onJoined,
    onUpdate: onUpdate,
  });
  let myId;
  let myStation;

  elStationCreate.addEventListener('click', () => {
    myStation = new Station(elStationId.value, {
      onStart: (myOffer) => {
        myRadio.start(myStation, myOffer);
      },
      onStop: () => {
        myRadio.stop();
      }
    });
    myRadio.add(myStation);
  });

  elStationRemove.addEventListener('click', () => {
    myRadio.remove(myStation.id);
  });

  elBroadcastStart.addEventListener('click', async () => {
    toggleAttribute('disabled', [elBroadcastStart, elBroadcastStop]);
    myStation.start();
  });

  elBroadcastStop.addEventListener('click', () => {
    toggleAttribute('disabled', [elBroadcastStart, elBroadcastStop]);
    myStation.stop();
  });

  elStations.addEventListener('click', (e) => {
    const stationId = e.target.getAttribute('data-id');
    myRadio.join(stationId);
  });

  // Event handlers

  function onConnected(listenerId) {
    myId = listenerId;
  }

  function onAdded(station) {
    if (station.owner === myId) {
      elStation.classList.add('hide');
      elBroadcast.classList.remove('hide');
    } else {
      elStation.classList.remove('hide');
      elBroadcast.classList.add('hide');
    }
  }

  function onRemoved(station) {
    if (station.owner === myId) {
      elStation.classList.remove('hide');
      elBroadcast.classList.add('hide');
    } else {
      elStation.classList.add('hide');
      elBroadcast.classList.remove('hide');
    }
  }

  function onJoined(station, offer) {
    console.log('onJoined', station, offer);
  }

  function onLeft(station, offer) {
    console.log('onLeft', station, offer);
  }

  function onUpdate(radio) {
    console.log('onUpdate', radio);
    // update stations
    addChildren(elStations, radio.stations, 'li', (items, id) => {
      return `${id} (${Object.keys(items[id].listeners).length || 0})`;
    });
    // update listeners
    addChildren(elListeners, radio.listeners, 'li', (items, id) => {
      return id;
    });
  }

  /* helper methods */

  function addChildren(parent, items, type, template) {
    const fragment = document.createDocumentFragment();
    Object.keys(items).forEach((id) => {
      const el = document.createElement(type);
      el.textContent = template(items, id);
      el.setAttribute('data-id', id);
      fragment.appendChild(el);
    });
    removeChildren(parent);
    parent.appendChild(fragment);
  }

  function removeChildren(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  function toggleAttribute(attribute, elements) {
    elements.forEach((element) => {
      if (element[attribute] === true) {
        element[attribute] = false;
      } else {
        element[attribute] = true;
      }
    });
  }

})();
