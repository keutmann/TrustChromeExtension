var PackageBuilder = (function() {

    PackageBuilder.BINARYTRUST_TC1 = "binarytrust.tc1";
    PackageBuilder.CONFIRMTRUST_TC1 = "confirm.tc1";
    PackageBuilder.RATING_TC1 = "rating.tc1";
    PackageBuilder.IDENTITY_TC1 = "identity.tc1";

    
    function PackageBuilder(settings) {
        this.settings = settings;

    }


    PackageBuilder.prototype.CreatePackage = function(trust) {
        var package = {
            trusts: [trust]
        }
        return package;
    }

    PackageBuilder.prototype.SignPackage = function(package) {
        for(var trustIndex in package.trusts) {
            var trust = package.trusts[trustIndex];
            this.CalculateTrustId(trust);
            this.SignTrust(trust);
        }
        return this;
    }

    PackageBuilder.prototype.CreateBinaryTrust = function(issuer, script, subject, value, note, scope, activate, expire)
    {
        var claim = { trust: value }
        if(!isNullOrWhitespace(note))
            claim.note = note;
            
        var trust = this.CreateTrust(issuer, script, subject, PackageBuilder.BINARYTRUST_TC1, scope, JSON.stringify(claim), activate, expire);
        return trust;
    }

    PackageBuilder.prototype.CreateIdentityTrust = function(issuer, script, subject, claim, scope, activate, expire)
    {
        //var attributes = { alias: value }
        var trust = this.CreateTrust(issuer, script, subject, PackageBuilder.IDENTITY_TC1, scope, JSON.stringify(claim), activate, expire);
        return trust;
    }

    PackageBuilder.prototype.CreateTrust = function(issuer, script, subject, type, scope, claim, activate, expire)  {
        // var trust = {
        //     issuerScript: script,
        //     issuerAddress: issuer,
        //     subjectAddress: subject,
        //     type: type,
        //     scope: (scope) ? scope: "",
        //     attributes: (attributes) ? attributes : "",
        //     created: Math.round(Date.now()/1000.0),
        //     cost: 100,
        //     activate: (activate) ? activate: 0,
        //     expire: (expire) ? expire: 0
        // }
        if(typeof scope === 'string')
            scope = { value : scope };

        var trust = {
            issuer : { 
                type: script,
                address: issuer
            },
            subject : {
                address: subject
            },
            type: type,
            claim: (claim) ? claim : "",
            scope: (scope) ? scope: undefined,
            created: Math.round(Date.now()/1000.0),
            cost: 100,
            activate: (activate) ? activate: 0,
            expire: (expire) ? expire: 0
        }

        return trust;
    }

    PackageBuilder.prototype.SignTrust = function(trust) {
        //trust.issuer.signature = this.settings.keyPair.signCompact(id);
        trust.issuer.signature = tce.bitcoin.message.sign(this.settings.keyPair, trust.id.base64ToBuffer());
    }

    PackageBuilder.prototype.CalculateTrustId = function(trust) {
        var buf = new tce.buffer.Buffer(1024 * 256); // 256 Kb
        var offset = 0;

        if(trust.issuer) {
            if(trust.issuer.type)
                offset += buf.write(trust.issuer.type.toLowerCase(), offset);

            if(trust.issuer.address) {
                var address = trust.issuer.address.base64ToBuffer();
                offset += address.copy(buf, offset, 0, trust.issuer.address.length);
            }
        }

        if(trust.subject) {
            if(trust.subject.type)
                offset += buf.write(trust.subject.type.toLowerCase(), offset);

            if(trust.subject.address) {
                var subjectaddress = trust.subject.address.base64ToBuffer();
                offset += subjectaddress.copy(buf, offset, 0, trust.subject.address.length); // Bytes!
            }
        }

        if(trust.type)
            offset += buf.write(trust.type.toLowerCase(), offset);


        if(trust.claim)
            offset += buf.write(trust.claim, offset);

        if(trust.scope) {
            if(trust.scope.type)
                offset += buf.write(trust.scope.type.toLowerCase(), offset);

            if(trust.scope.value)
                offset += buf.write(trust.scope.value, offset);
        }

        offset = buf.writeInt32LE(trust.created, offset);
        offset = buf.writeInt32LE(trust.cost, offset);
        offset = buf.writeInt32LE(trust.activate, offset);
        offset = buf.writeInt32LE(trust.expire, offset);

        var data = new tce.buffer.Buffer(offset);
        buf.copy(data, 0, 0, offset);
        trust.id = tce.bitcoin.crypto.hash256(data); 
    }

    return PackageBuilder;
}())