(function () {
  let radio = new Radio();
  let station;

  elCreate.addEventListener('click', () => {
    station = new Station({
      name: elName.name.value
    });
    toggleClass('hide', [elRadio, elStation]);
  });
  
  elStart.addEventListener('click', () => {
    station.start();
    toggleAttribute('disabled', [elStart, elStop]);
  });

  elStop.addEventListener('click', () => {
    station.stop();
    toggleAttribute('disabled', [elStart, elStop]);
  });

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
