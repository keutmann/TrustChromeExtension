///<reference path="../typings/globals/jquery/index.d.ts" />

var SubjectService = (function() {
    function SubjectService(settings, packageBuilder) {
        this.SCRIPT = "btc-pkh";
        this.settings = settings;
        this.packageBuilder = packageBuilder;
    }

    SubjectService.prototype.BuildBinaryTrust = function(target, value, note, expire) {
        var trust = this.packageBuilder.CreateBinaryTrust(
            this.settings.publicKeyHash, 
            this.SCRIPT, 
            target.address, 
            value, 
            note,
            target.scope,
            0,
            expire);

        var package = this.packageBuilder.CreatePackage(trust);

        if(target.owner) {
            var subjectAddress = new tce.buffer.Buffer(target.owner.address, 'HEX');

            var ownerTrust = this.packageBuilder.CreateBinaryTrust(
                this.settings.publicKeyHash, 
                this.SCRIPT, 
                subjectAddress, 
                value, 
                note,
                target.scope,
                0,
                expire);
            package.trusts.push(ownerTrust);

            if(target.type == "thing" && !isNullOrWhitespace(target.alias)) { 
                var aliastrust = this.packageBuilder.CreateIdentityTrust(
                    this.settings.publicKeyHash,
                    this.SCRIPT, 
                    subjectAddress,
                    { alias: target.alias },
                    target.scope,
                    0,
                    expire);

                package.trusts.push(aliastrust);
    
            }
        }
        return package;
    }

    return SubjectService;
}())


