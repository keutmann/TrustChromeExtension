var PackageBuilder = (function() {
    function PackageBuilder(settings) {
        this.settings = settings;

        this.BINARYTRUST_TC1 = "binarytrust.tc1";
        this.CONFIRMTRUST_TC1 = "confirm.tc1";
        this.RATING_TC1 = "rating.tc1";
        this.IDENTITY_TC1 = "identity.tc1";

    }


    PackageBuilder.prototype.CreatePackage = function(trust) {
        var package = {
            trusts: [trust]
        }
        return package;
    }

    PackageBuilder.prototype.CreateBinaryTrust = function(issuer, script, subject, value, scope)
    {
        var attributes = { trust: value }
        var trust = this.CreateTrust(issuer, script, subject, this.BINARYTRUST_TC1, scope, JSON.stringify(attributes));
        return trust;
    }

    PackageBuilder.prototype.CreateIdentityTrust = function(issuer, script, subject, alias, scope)
    {
        var attributes = { alias: value }
        var trust = this.CreateTrust(issuer, script, subject, this.IDENTITY_TC1, scope, JSON.stringify(attributes));
        return trust;
    }

    PackageBuilder.prototype.CreateTrust = function(issuer, script, subject, type, scope, attributes)  {
        var trust = {
            issuerScript: script,
            issuerAddress: issuer,
            subjectAddress: subject,
            type: type,
            scope: scope,
            attributes: attributes,
            cost: 100,
            activate: 0,
            expire: 0,
            note: ""
        }
        return trust;
    }

    PackageBuilder.prototype.SignTrust = function(trust) {
        var id = (typeof trust.id === 'string') ? new tce.buffer.Buffer(trust.id, 'base64') : trust.id;
        trust.issuerSignature = tce.bitcoin.message.sign(this.settings.keyPair, id);
    }

    PackageBuilder.prototype.CalculateTrustId = function(trust) {
        var buf = new tce.buffer.Buffer(1024 * 256); // 256 Kb
        var offset = 0;
        if(trust.issuerScript)
            offset += buf.write(trust.issuerScript.toLowerCase(), offset);

        if(trust.issuerAddress)
            offset += trust.issuerAddress.copy(buf, offset, 0, trust.issuerAddress.length);

        if(trust.subjectScript)
            offset += buf.write(trust.subjectScript.toLowerCase(), offset);

        if(trust.subjectAddress)
            offset += trust.subjectAddress.copy(buf, offset, 0, trust.subjectAddress.length); // Bytes!

        if(trust.type)
            offset += buf.write(trust.type.toLowerCase(), offset);

        if(trust.scope)
            offset += buf.write(trust.scope.toLowerCase(), offset);

        if(trust.attributes)
            offset += buf.write(trust.attributes, offset);

        offset = buf.writeInt32LE(trust.cost, offset);
        offset = buf.writeInt32LE(trust.activate, offset);
        offset = buf.writeInt32LE(trust.expire, offset);

        var data = new tce.buffer.Buffer(offset);
        buf.copy(data, 0, 0, offset);
        trust.id = tce.bitcoin.crypto.hash256(data); 
    }

    return PackageBuilder;
}())