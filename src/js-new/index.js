(function () {
  let myListener = new Listener();
  let myRadio = new Radio({
    onRadioUpdate: onRadioUpdate,
    onStationUpdate: onStationUpdate
  });
  let myStation;

  elStationCreate.addEventListener('click', () => {
    toggleClass('hide', [elStation, elBroadcast]);
    myStation = new Station(elStationId.value, {
      onStart: (myOffer) => {
        radio.start(myStation, myOffer);
      }
    });
    myRadio.add(myStation);
  });

  elStationRemove.addEventListener('click', () => {
    toggleClass('hide', [elStation, elBroadcast]);
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

  function onRadioUpdate(radio) {
    console.log('radio.update', radio);
    // update stations
    addChildren(elStations, radio.stations, 'li', (item) => {
      return `${item.id} (${item.listeners.length})`;
    }, (station) => {
      myRadio.join(station);
    });
    // update listeners
    addChildren(elListeners, radio.listeners, 'li', (item) => {
      return item;
    });
  }

  function onStationUpdate(station, offer) {
    console.log('onStationUpdate', station, offer);
  }

  /* helper methods */

  function addChildren(parent, items, type, template, click) {
    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      const el = document.createElement(type);
      el.textContent = template(item);
      if (click) {
        el.addEventListener('click', () => {
          click(item);
        });
      }
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

  function toggleClass(classname, elements) {
    elements.forEach((element) => {
      if (element.classList.contains(classname)) {
        element.classList.remove(classname);
      } else {
        element.classList.add(classname);
      }
    });
  }

})();
