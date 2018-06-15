var SettingsController = (function() {
    function SettingsController()
    {
        var self = this;
        this.createSettings = function() {
            var settings = {
                "password": '',
                "seed": '',
                "rememberme": true,
                "infoserver": "https://trust.dance",
                // "buildserver": "https://trust.dance:12701",
                // "graphserver": "https://trust.dance:12702",
                'trustrender': 'icon',
                "resultrender": 'warning'
                //"keypair": null
            }
            return settings;
        }
    
        this.saveSettings = function(settings) {
            if (settings.rememberme) {
                settings.keyPair = undefined;
                settings.publicKeyHash = undefined;
                chrome.storage.local.set({ usersettings: settings }, function () {
                    this.buildKey(settings);
                    console.log('Settings saved');

                });
            }
        }
    
        this.loadSettings = function (cb) {
            chrome.storage.local.get('usersettings', function (result) {
                var settings = (result.usersettings) ? result.usersettings : self.createSettings();
                self.buildKey(settings);
                cb(settings);
            });
        }
    
        this.buildKey = function (settings) {
            var keystring = settings.password + settings.seed;
            var hash = tce.bitcoin.crypto.hash256(keystring);
            var d = tce.BigInteger.fromBuffer(hash)
            
            settings.keyPair = new tce.bitcoin.ECPair(d)
            settings.publicKeyHash = tce.bitcoin.crypto.hash160(settings.keyPair.getPublicKeyBuffer());
            settings.publicKeyHashBase64 = settings.publicKeyHash.toString('base64');
            settings.address64 = settings.publicKeyHash.toString('base64');
            settings.address = settings.keyPair.getAddress();
            return settings.keyPair;
        }
    }

    return SettingsController;
}())

