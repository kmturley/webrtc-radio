(function () {
  let listener = new Listener();
  let radio = new Radio({
    onUpdate: onRadioUpdate
  });
  let myStation;

  elStationCreate.addEventListener('click', () => {
    toggleClass('hide', [elStation, elBroadcast]);
    myStation = new Station(elStationId.value);
    radio.add(myStation);
  });

  elStationRemove.addEventListener('click', () => {
    toggleClass('hide', [elStation, elBroadcast]);
    radio.remove(myStation.id);
  });
  
  elBroadcastStart.addEventListener('click', async () => {
    toggleAttribute('disabled', [elBroadcastStart, elBroadcastStop]);
    const offer = await myStation.start();
    console.log('offer.sdp', offer.sdp);
  });

  elBroadcastStop.addEventListener('click', () => {
    toggleAttribute('disabled', [elBroadcastStart, elBroadcastStop]);
    myStation.stop();
  });

  function onRadioUpdate(stations) {
    addChildren(elStations, stations, 'li', (station) => {
      radio.join(station);
    });
  }

  /* helper methods */

  function addChildren(parent, items, type, click) {
    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      const el = document.createElement(type);
      el.textContent = `${item.id} (${item.listeners})`;
      el.addEventListener('click', () => {
        click(item);
      });
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
