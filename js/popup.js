var controller = new SettingsController();

// Onload
$(function () {
    controller.loadSettings(function (items) {
        controller.buildKey(items);
        BindSettings(items);
    });
});


$("#generateIDbtn").click(function () {
    controller.loadSettings(function (items) {
        items["password"] = $("#inputPassword").val(),
        items["seed"] = $("#inputSeed").val(),
        items["rememberme"] = $("#rememberMe").is(':checked')

        controller.saveSettings(items);
        controller.buildKey(items);
        BindSettings(items);
    });
});

function BindSettings(items) {
    $("#inputPassword").val(items.password);
    $("#inputSeed").val(items.seed);
    $("#address").text(items.keyPair.getAddress());
    $("#privateKey").text(items.keyPair.toWIF());
    var hash = tce.bitcoin.crypto.hash256("Demo");
    var sig = items.keyPair.sign(hash);
    $("#signature").text(sig.toDER().toString('HEX'));
}
