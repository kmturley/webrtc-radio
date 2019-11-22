(function () {
  let myRadio = new Radio({
    onConnected: onConnected,
    onAdded: onAdded,
    onRemoved: onRemoved,
    onLeft: onLeft,
    onJoined: onJoined,
    onStarted: onStarted,
    onStopped: onStopped,
    onUpdated: onUpdated,
  });
  let myId;
  let myStation;
  let myListeners = {};

  elStationCreate.addEventListener('click', () => {
    myStation = new Station(elStationId.value, {
      onStart: (myOffer) => {
        myRadio.start(myStation.id, myOffer);
      },
      onStop: () => {
        myRadio.stop(myStation.id);
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

  function onJoined(station) {
    console.log('onJoined', station);
    Object.keys(station.listeners).forEach((id) => {
      if (!myListeners[id]) {
        myListeners[id] = new Listener(id);
      }
    });
    console.log('myListeners', myListeners);
  }

  function onLeft(station, offer) {
    console.log('onLeft', station, offer);
  }

  function onStarted(station, offer) {
    console.log('onStarted', station, offer);
  }

  function onStopped(station, offer) {
    console.log('onStopped', station, offer);
  }

  function onUpdated(radio) {
    console.log('onUpdated', radio);
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
