var controller = new SettingsController();

// Onload
$(function () {
    controller.loadSettings(function (items) {
        controller.buildKey(items);
        BindSettings(items);
    });
});


$("#savebtn").click(function () {
    controller.loadSettings(function (items) {
        items["password"] = $("#inputPassword").val();
        items["seed"] = $("#inputSeed").val();
        items["rememberme"] = $("#rememberMe").is(':checked');
        items["infoserver"] = $("#infoserver").val();
        items["buildserver"] = $("#buildserver").val();
        items["graphserver"] = $("#graphserver").val();

        controller.saveSettings(items);
        controller.buildKey(items);
        BindSettings(items);
    });
});

function BindSettings(items) {
    $("#inputPassword").val(items.password);
    $("#inputSeed").val(items.seed);
    $("#infoserver").val(items.infoserver);
    $("#buildserver").val(items.buildserver);
    $("#graphserver").val(items.graphserver);
    $("#address").text(items.keyPair.getAddress());
    $("#privateKey").text(items.keyPair.toWIF());
    var hash = tce.bitcoin.crypto.hash256("Demo");
    var sig = items.keyPair.sign(hash);
    $("#signature").text(sig.toDER().toString('HEX'));
}
