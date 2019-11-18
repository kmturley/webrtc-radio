(function () {
  let listener = new Listener();
  let radio = new Radio({
    onStations: onStations
  });
  let myStation;

  elStationCreate.addEventListener('click', () => {
    myStation = new Station(elStationId.value);
    radio.add(myStation);
    toggleClass('hide', [elRadio, elStation]);
  });

  elStationRemove.addEventListener('click', () => {
    radio.remove(elStationId.value);
  });
  
  elStart.addEventListener('click', async () => {
    toggleAttribute('disabled', [elStart, elStop]);
    const offer = await station.start();
    console.log('offer.sdp', offer.sdp);
  });

  elStop.addEventListener('click', () => {
    toggleAttribute('disabled', [elStart, elStop]);
    station.stop();
  });

  function onStations(stations) {
    addChildren(elStations, stations, 'li', (station) => {
      radio.join(station);
    });
  }

  /* helper methods */

  function addChildren(parent, items, type, click) {
    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      const el = document.createElement(type);
      el.textContent = item.id;
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
