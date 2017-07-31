var settingsController = new SettingsController();
var target;
var settings; 

// Onload
$(function () {
    var settings = settingsController.createSettings();
    settings.password = "server";
    settings.seed = "";
    settingsController.buildKey(settings);

});

