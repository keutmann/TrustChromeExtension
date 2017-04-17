function SettingsController()
{
    var self = this;
    this.createSettings = function() {
        var settings = {
            "password": '',
            "seed": '',
            "rememberme": true,
            //"keypair": null
        }
        return settings;
    }

    this.saveSettings = function(settings) {
        if (settings.rememberme) {
            chrome.storage.local.set(settings, function () {
                console.log('Settings saved');
            });
        }
    }

    this.loadSettings = function (cb) {
        var settings = self.createSettings();
        chrome.storage.local.get(settings, function (items) {
            cb(items);
        });
    }

    this.buildKey = function (settings) {
        var keystring = settings.password + settings.seed;
        var hash = tce.bitcoin.crypto.hash256(keystring);
        var d = tce.BigInteger.fromBuffer(hash)

        settings.keyPair = new tce.bitcoin.ECPair(d)
    }

    return this;
}