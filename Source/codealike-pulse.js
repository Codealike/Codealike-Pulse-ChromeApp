var users = [];
var selectedUsername = "";
var selectedDisplayName = "";
var apiToken = "";
var apiOk = false;

$(document).ready(function () {

  $("#offline-mode").hide();
  $("#onboarding").hide();
  var snackbarContainer = document.querySelector('#toast-message');

  chrome.storage.sync.get("token", function (val) {
 
    if($.isEmptyObject(val))
    {
      $("#onboarding").show();
      $("#offline-mode").hide();
      $("#online-mode").hide();
    }
    else
    {
      setToken(val.token);
    }
  });

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

  $("#codealike-api-token").change(function(e){
    setToken($("#codealike-api-token").val());
  });

  $("#onboarding-ok").click(function(e){
    setToken($("#onboarding-token").val());
  });

  function setToken(token)
  {
    apiToken = $.trim(token);

    chrome.storage.sync.set({ "token": apiToken }, function () {
      $("#codealike-api-token").val(apiToken);
      $("#onboarding-token").val(apiToken);
    });

    apiOk = true;

    getUsers();
    updateCanInterruptStatusBatch();    
  }

  $(document).on('click', ".light-ok", function () {
    selectLight(this, selectedUsername, selectedDisplayName);
  });

  function selectLight(control, username, displayName)
  {
      $(control).parent().data("username", username);

      var blink1 = new Blink1($(control).parent().data("light"));

      blink1.connect(function (success) {
        if (success) {
          if($("#" + username + "-card .user-card-square .pulse-status").hasClass("red"))
          {
            blink1.fadeRgb(164, 3, 0, 250, 0);
          }
          else if($("#" + username + "-card .user-card-square .pulse-status").hasClass("darkGreen"))
          {
            blink1.fadeRgb(0, 159, 0, 250, 0);
          }
          else
          {
            blink1.fadeRgb(0, 0, 0, 0, 0);
          }
        }
      });

      $(control).parent().find(".username").html("&nbsp; <strong>" + displayName + "</strong>");
  }

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

  function getUsers()
  {
    chrome.storage.sync.get("users", function (val) {
      users = val.users;

      if (!users) {
        users = []
      }

        $('#grid-cards').html("");
        $.each(users, function (index, value) {
          addUser(value);
        });

        $("#online-mode").show();
        $("#offline-mode").hide();
        $("#onboarding").hide();

    });
  }

  $("#add-user-spinner").hide();

  $("#username").keydown(function(e){
      if(e.keyCode==13)
      {
        validateAddUser();
      }
    });

  $("#add-user").click(function () {
      validateAddUser();
  });

  function validateAddUser()
  {
    if(!$("#username").val().trim())
    {
      snackbarContainer.MaterialSnackbar.showSnackbar({ message: "You should enter a valid Codealike username." });
      return false;
    }

    var username = $("#username").val().trim();

    if ($.inArray(username, users) == -1) {
      addUser(username);
      $("#username").val("")
      snackbarContainer.MaterialSnackbar.showSnackbar({ message: "The user " + username + " was added to dashboard." });
    }
    else {
      snackbarContainer.MaterialSnackbar.showSnackbar({ message: "User already exists in the dashboard." });
    }
  }

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
      snackbarContainer.MaterialSnackbar.showSnackbar({ message: "The user " + username + " was deleted from dashboard." });
      $("#add-user-spinner").hide();
    });
  }

  function addUser(username) {
    $("#add-user").hide();
    $("#add-user-spinner").show();

    var tokenValues = apiToken.split("/");
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
        if (data.statusText == "success") {

          $.get('assets/templates/user-card.mst', function (template) {
            data.responseJSON.FullIdentity = data.responseJSON.Identity;
            data.responseJSON.Identity = data.responseJSON.Identity.replace(/\./g, '');

            data.responseJSON.IsYou = (data.responseJSON.Identity == apiToken.split("/")[0]);

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

            $("#online-mode").show();
            $("#offline-mode").hide();
            $("#onboarding").hide();

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
          });

        }
        else {
          if(data.status == 401)
          {
            console.log("Query to Server is forbidden. Bad token.");
            $("#online-mode").hide();
            $("#offline-mode").hide();
            $("#onboarding").show();
            $("#add-user").show();
            $("#add-user-spinner").hide();
            return { result: "failed" };
          } else if(data.status == 404)
          {
            console.log("User does not exist.");

            snackbarContainer.MaterialSnackbar.showSnackbar({ message: "User does not exist." });

            $("#add-user").show();
            $("#add-user-spinner").hide();
            return { result: "failed" };
          }
          else
          {
            console.log("Receiving activity from Server FAILED");
            $("#online-mode").hide();
            $("#offline-mode").show();
            $("#onboarding").hide();
            $("#add-user").show();
            $("#add-user-spinner").hide();
            return { result: "failed" };
          }
        }
      }
    });
  }
});

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (apiOk)
  {
    updateCanInterruptStatusBatch();
  }
});

var bg = undefined;

(function () {
  function initializeWindow() {
    chrome.hid.getDevices({}, onDevicesEnumerated);
    if (chrome.hid.onDeviceAdded) {
      chrome.hid.onDeviceAdded.addListener(onDeviceAdded);
    }
    if (chrome.hid.onDeviceRemoved) {
      chrome.hid.onDeviceRemoved.addListener(onDeviceRemoved);
    }
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
    $("#" + deviceId + "-light").remove();
    switchToDevice(deviceId);
  }

  function addNewDevice(blink1) {
    $.get('assets/templates/light-card.mst', function (template) {

      var lightData = {
        LightID: blink1.deviceId,
        Vendor: "blink1",
        Version: blink1.version,
        Username: ""
      };

      var html = Mustache.to_html(template, lightData);

      $("#lights").append(html);

      /*If it's first device, assign to current user if it's tracked.*/
      // Is this the first light?
      if($("#lights").children().length == 1)
      {
        // Is current user being tracked?
        if($("#" + apiToken.split("/")[0] + "-card").length == 1)
        {
          // Select first light for user.
          selectLight($("#" + lightData.LightID + "-light"), apiToken.split("/")[0], selectedDisplayName);
        }
      }
    });

  }

  function setActiveDevice(blink1) {
    bg.blink1 = blink1;
  }

  function switchToDevice(deviceId) {
    var blink1 = new Blink1(deviceId);
    blink1.connect(function (success) {
      if (success) {
        setActiveDevice(blink1);
      }
    });
  }

  window.addEventListener('load', function () {
    chrome.runtime.getBackgroundPage(function (backgroundPage) {
      bg = backgroundPage;
      initializeWindow();
    });
  });
} ());

function updateCanInterruptStatusBatch() {
  if (users.length > 0) {
    $.unique(users);

    updateCanInterruptUserStatus(users);
  }

  return users.length;
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
          var username = e.m_Item1;
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
  username = username.replace(/\./g, '');
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