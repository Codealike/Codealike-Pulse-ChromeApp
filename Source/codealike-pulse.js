var users = [];
var selectedUsername = "";
var selectedDisplayName = "";

$(document).ready(function () {

  $("#offline-mode").hide();

  $(document).on('click', ".user-selection", function () {

    selectedUsername = "";
    selectedDisplayName = "";

    if ($(this).hasClass("selected")) {
      $(".user-selection").removeClass("selected");
      $(".light-ok").hide();
    }
    else {
      $(".user-selection").removeClass("selected");
      selectedUsername = $(this).parent().data("username");
      selectedDisplayName = $(this).parent().data("displayname");
      $(".light-ok").show();
      $(this).addClass("selected");
    }
  });

  $(document).on('click', ".light-ok", function () {

    $(this).parent().data("username", selectedUsername);

    var blink1 = new Blink1($(this).parent().data("light"));

    blink1.connect(function (success) {
      if (success) {
        blink1.fadeRgb(0, 0, 0, 0, 0);
      }
    });

    $(this).parent().find(".username").html("&nbsp; <strong>" + selectedDisplayName + "</strong>");
  });

  $(document).on('click', ".light-locate", function () {
    var isSelected = $(this).data("selected");
    var values0 = { r: 0, g: 0, b: 0, speed: 500, led: 0 };
    var values1 = { r: 0, g: 0, b: 0, speed: 1000, led: 0 };
    var values2 = { r: 0, g: 0, b: 0, speed: 1500, led: 0 };

    if (isSelected == 1) {
      isSelected = 0;
    }
    else {
      values0 = { r: 0, g: 250, b: 0, speed: 250, led: 0 };
      values1 = { r: 120, g: 0, b: 120, speed: 500, led: 1 };
      values2 = { r: 0, g: 120, b: 120, speed: 1000, led: 2 };

      isSelected = 1;
    }

    var blink1 = new Blink1($(this).parent().data("light"));

    blink1.connect(function (success) {
      if (success) {
        blink1.fadeRgb(values0.r, values0.g, values0.b, values0.speed, values0.led);
        blink1.fadeRgb(values1.r, values1.g, values1.b, values1.speed, values1.led);
        blink1.fadeRgb(values2.r, values2.g, values2.b, values2.speed, values2.led);
      }
    });

    $(this).data("selected", isSelected);
  });

  var snackbarContainer = document.querySelector('#toast-message');

  chrome.storage.sync.get("users", function (val) {
    users = val.users;

    if (!users) {
      users = []
    }

    $.each(users, function (index, value) {
      addUser(value);
    });
  });

  $("#add-user-spinner").hide();

  $("#add-user").click(function () {
    var username = $("#username").val();

    if ($.inArray(username, users) == -1) {
      addUser(username);
    }
    else {
      snackbarContainer.MaterialSnackbar.showSnackbar({ message: "User already exists in the dashboard." });
    }
  });

  $(document).on('click', '.delete', function () {
    deleteUser($(this).data("username"));
  });

  function deleteUser(username) {
    $("#add-user").hide();
    $("#add-user-spinner").show();

    users = jQuery.grep(users, function (value) {
      return value != username;
    });

    chrome.storage.sync.set({ "users": users }, function () {
      $("#" + username + "-card").remove();
      $("#add-user").show();
      $("#add-user-spinner").hide();
    });
  }

  function addUser(username) {
    $("#add-user").hide();
    $("#add-user-spinner").show();

    var userData = "soke/c12060a3-1ace-450a-b4ae-1eaec2ef4a31";
    var tokenValues = userData.split("/");
    var identity = tokenValues[0];
    var token = tokenValues[1];

    $.ajax({
      type: "GET",
      url: "https://codealike.com/api/v2/account/" + username + "/profile",
      contentType: "application/json",
      dataType: "json",
      cache: false,
      data: null,
      beforeSend: function (request) {
        request.setRequestHeader("X-Api-Identity", identity);
        request.setRequestHeader("X-Api-Token", token);
      },
      complete: function (data, textStatus, jqXHR) {
        if (data.statusText == "OK") {

          $.get('assets/templates/user-card.mst', function (template) {
            data.responseJSON.FullIdentity = data.responseJSON.Identity;
            data.responseJSON.Identity = data.responseJSON.Identity.replace(/\./g, '');

            var html = Mustache.to_html(template, data.responseJSON);

            $('#grid-cards').append(html);

            var remoteImage,
              container = document.querySelector("#" + data.responseJSON.Identity + "-card .avatar");

            remoteImage = new RAL.RemoteImage(data.responseJSON.AvatarUri);
            container.appendChild(remoteImage.element);
            remoteImage.src = data.responseJSON.AvatarUri;
            RAL.Queue.add(remoteImage);
            RAL.Queue.setMaxConnections(4);
            RAL.Queue.start();

            if ($.inArray(username, users) == -1) {
              users.push(username);

              chrome.storage.sync.set({ "users": users }, function () {
                $("#add-user").show();
                $("#add-user-spinner").hide();
              });
            }
            else {
              $("#add-user").show();
              $("#add-user-spinner").hide();
            }

            $("#online-mode").show();
            $("#offline-mode").hide();
          });

        }
        else {
          console.log("Receiving activity from Server FAILED");
          $("#online-mode").hide();
          $("#offline-mode").show();
          $("#add-user").show();
          $("#add-user-spinner").hide();
          return { result: "failed" };
        }
      }
    });
  }
});

chrome.alarms.onAlarm.addListener(function (alarm) {
  updateCanInterruptStatusBatch();
});

var bg = undefined;

(function () {
  var ui = {
    picker: null,
    r: null,
    g: null,
    b: null
  };


  function initializeWindow() {
    for (var k in ui) {
      var id = k.replace(/([A-Z])/, '-$1').toLowerCase();
      var element = document.getElementById(id);
      if (!element) {
        throw "Missing UI element: " + k;
      }
      ui[k] = element;
    }
    setGradients();
    ui.picker.addEventListener('change', onSelectionChanged);
    ui.r.addEventListener('input', onColorChanged);
    ui.g.addEventListener('input', onColorChanged);
    ui.b.addEventListener('input', onColorChanged);

    chrome.hid.getDevices({}, onDevicesEnumerated);
    if (chrome.hid.onDeviceAdded) {
      chrome.hid.onDeviceAdded.addListener(onDeviceAdded);
    }
    if (chrome.hid.onDeviceRemoved) {
      chrome.hid.onDeviceRemoved.addListener(onDeviceRemoved);
    }
  };

  function enableControls(enabled) {
    ui.r.disabled = !enabled;
    ui.g.disabled = !enabled;
    ui.b.disabled = !enabled;
  };

  function onDevicesEnumerated(devices) {
    if (chrome.runtime.lastError) {
      console.error("Unable to enumerate devices: " +
        chrome.runtime.lastError.message);
      return;
    }

    for (var device of devices) {
      onDeviceAdded(device);
    }
  }

  function onDeviceAdded(device) {
    if (device.vendorId != Blink1.VENDOR_ID ||
      device.productId != Blink1.PRODUCT_ID) {
      return;
    }

    var blink1 = new Blink1(device.deviceId);
    blink1.connect(function (success) {
      if (success) {
        blink1.getVersion(function (version) {
          if (version) {
            blink1.version = version;
            addNewDevice(blink1);
          }
        });
      }
    });
  }

  function onDeviceRemoved(deviceId) {
    var option = ui.picker.options.namedItem('device-' + deviceId);

    if (!option) {
      return;
    }

    if (option.selected) {
      bg.blink1.disconnect(function () { });
      bg.blink1 = undefined;
      enableControls(false);

      if (option.previousSibling) {
        option.previousSibling.selected = true;
      }

      if (option.nextSibling) {
        option.nextSibling.selected = true;
      }
    }

    $("#" + deviceId + "-light").remove();

    ui.picker.remove(option.index);

    if (ui.picker.options.length == 0) {
      var empty = document.createElement('option');
      empty.text = 'No devices found.';
      empty.id = 'empty';
      empty.selected = true;
      ui.picker.add(empty);
      ui.picker.disabled = true;
    } else {
      switchToDevice(ui.picker.selectedIndex);
    }
  }

  function addNewDevice(blink1) {
    var firstDevice = ui.picker.options[0].id == 'empty';
    var option = document.createElement('option');

    option.text = blink1.deviceId + ' (version ' + blink1.version + ')';
    option.id = 'device-' + blink1.deviceId;
    ui.picker.add(option);
    ui.picker.disabled = false;

    $.get('assets/templates/light-card.mst', function (template) {

      var lightData = {
        LightID: blink1.deviceId,
        Vendor: "blink1",
        Version: blink1.version,
        Username: ""
      };

      var html = Mustache.to_html(template, lightData);

      $("#lights").append(html);
    });

    if (firstDevice) {
      ui.picker.remove(0);
      option.selected = true;
      setActiveDevice(blink1);
    } else {
      blink1.disconnect(function () { });
    }
  }

  function setActiveDevice(blink1) {
    bg.blink1 = blink1;
    bg.blink1.getRgb(0, function (r, g, b) {
      ui.r.value = r || 0;
      ui.g.value = g || 0;
      ui.b.value = b || 0;
      setGradients();
    });
    enableControls(true);
  }

  function switchToDevice(optionIndex) {
    var deviceId = parseInt(ui.picker.options[optionIndex].id.substring(7));
    var blink1 = new Blink1(deviceId);
    blink1.connect(function (success) {
      if (success) {
        setActiveDevice(blink1);
      }
    });
  }

  function switchToDeviceById(optionIndex) {
    var deviceId = parseInt(ui.picker.options[optionIndex].id.substring(7));
    var blink1 = new Blink1(deviceId);
    blink1.connect(function (success) {
      if (success) {
        setActiveDevice(blink1);
      }
    });
  }

  function onSelectionChanged() {
    bg.blink1.disconnect(function () { });
    bg.blink1 = undefined;
    enableControls(false);
    switchToDevice(ui.picker.selectedIndex);
  }

  function onColorChanged() {
    setGradients();
    bg.blink1.fadeRgb(ui.r.value, ui.g.value, ui.b.value, 250, 0);
  }

  function setGradients() {
    var r = ui.r.value, g = ui.g.value, b = ui.b.value;
    ui.r.style.background =
      'linear-gradient(to right, rgb(0, ' + g + ', ' + b + '), ' +
      'rgb(255, ' + g + ', ' + b + '))';
    ui.g.style.background =
      'linear-gradient(to right, rgb(' + r + ', 0, ' + b + '), ' +
      'rgb(' + r + ', 255, ' + b + '))';
    ui.b.style.background =
      'linear-gradient(to right, rgb(' + r + ', ' + g + ', 0), ' +
      'rgb(' + r + ', ' + g + ', 255))';
  }

  window.addEventListener('load', function () {
    // Once the background page has been loaded, it will not unload until this
    // window is closed.
    chrome.runtime.getBackgroundPage(function (backgroundPage) {
      bg = backgroundPage;
      initializeWindow();
    });
  });
} ());

function updateCanInterruptStatusBatch() {
  var usernames = [];

  $(".user-card-square").each(function (index) {
    usernames.push($(this).data("username"));
  });

  if (usernames.length > 0) {
    $.unique(usernames);

    updateCanInterruptUserStatus(usernames);
  }

  return usernames.length;
}

function updateCanInterruptUserStatus(usernames) {
  $.ajax({
    type: 'POST',
    url: 'https://codealike.com/api/v2/public/CanInterruptUser',
    data: JSON.stringify({ UserNames: usernames }),
    dataType: 'json',
    contentType: 'application/json'
  })
    .done(function (success) {

      $("#online-mode").show();
      $("#offline-mode").hide();

      var allUsersResult = $.map(users, function (user) {
        var exists = false;
        var value = "NoActivity"

        $.each(success, function (index, e) {
          var username = e.m_Item1.replace(/\./g, "");
          var result = e.m_Item2;

          if (user == username) {
            value = result;
            return false;
          }
        });

        defineInterruptionStatusUI(user, value);
      });
    })
    .fail(function () {
      $("#online-mode").hide();
      $("#offline-mode").show();
    });
};

function defineInterruptionStatusUI(username, result) {
  $("#" + username + "-card .user-card-square .pulse-status").removeClass("grey");
  $("#" + username + "-card .user-card-square .pulse-status").removeClass("red");
  $("#" + username + "-card .user-card-square .pulse-status").removeClass("darkGreen");

  if (result == "NoActivity") {
    $("#" + username + "-card .user-card-square .pulse-status").addClass("grey");
    var devices = $('.chip-light').filter(function () {
      return $(this).data("username") == username;
    });

    if (devices.length > 0) {
      var blink1 = new Blink1($(devices).data("light"));

      blink1.connect(function (success) {
        if (success) {
          blink1.fadeRgb(0, 0, 0, 0, 0);
        }
      });
    }
  }
  else if (result == "CannotInterrupt") {
    $("#" + username + "-card .user-card-square .pulse-status").addClass("red");

    var devices = $('.chip-light').filter(function () {
      return $(this).data("username") == username;
    });

    if (devices.length > 0) {
      var blink1 = new Blink1($(devices).data("light"));

      blink1.connect(function (success) {
        if (success) {
          blink1.fadeRgb(164, 3, 0, 250, 0);
        }
      });
    }
  }
  else {
    $("#" + username + "-card .user-card-square .pulse-status").addClass("darkGreen");

    var devices = $('.chip-light').filter(function () {
      return $(this).data("username") == username;
    });

    if (devices.length > 0) {
      var blink1 = new Blink1($(devices).data("light"));

      blink1.connect(function (success) {
        if (success) {
          blink1.fadeRgb(0, 159, 0, 250, 0);
        }
      });
    }
  }
}