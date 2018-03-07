var PackageBuilder = (function() {
    function PackageBuilder(settings) {
        this.settings = settings;

        this.BINARYTRUST_TC1 = "binarytrust.tc1";
        this.CONFIRMTRUST_TC1 = "confirm.tc1";
        this.RATING_TC1 = "rating.tc1";

    }


    PackageBuilder.prototype.CreatePackage = function(trust) {
        var package = {
            trust: [trust]
        }
        return package;
    }

    PackageBuilder.prototype.CreateBinaryTrust = function(issuer, script, subject, alias, value, scope)
    {
        var trust = this.CreateTrust(issuer, script);
        var claim = this.CreateTrustClaim(value, scope);
        var subject = this.CreateSubject(subject, alias, [claim.index]);
        trust.subjects.push(subject);
        trust.claims.push(claim);
        return trust;
    }


    PackageBuilder.prototype.CreateTrustClaim = function(value, scope) {
        var attributes = { trust: value }
        var claim = this.CreateClaim(0, this.BINARYTRUST_TC1, JSON.stringify(attributes), scope);
        return claim;
    }


    PackageBuilder.prototype.CreateTrust = function(address, script)  {
        var trust = {
            issuer: {
                script: script,
                address: address
            },
            subjects: [],
            claims: []
        }
        return trust;
    }

    PackageBuilder.prototype.CreateSubject = function(address, alias, claimIndexs) {
        var subject = {
            address: address,
            alias: alias,
            claimIndexs: claimIndexs
        }
        return subject;
    }

    PackageBuilder.prototype.CreateClaim = function(index, type, attributes, scope) {
        var claim = {
            index: index,
            type: type,
            attributes: attributes,
            scope: scope,
            cost: 100,
            activate: 0,
            expire: 0,
            note: ""
        }
        return claim;
    }


    

    PackageBuilder.prototype.SignTrust = function(trust) {
        var id = (typeof trust.id === 'string') ? new tce.buffer.Buffer(trust.id, 'base64') : trust.id;
        trust.issuer.signature = tce.bitcoin.message.sign(this.settings.keyPair, id);
    }



 /*   PackageBuilder.prototype.calculateTrustId = function(trust) {
        var buf = new tce.buffer.Buffer(1024 * 256); // 256 Kb
        var offset = 0;
        offset = trust.issuer.id.copy(buf, offset, 0, trust.issuer.address.length);

        for (k in trust.issuer.subject) {
            var s = trust.issuer.subject[k];

            offset += s.id.copy(buf, offset, 0, s.id.length); // Bytes!

            for (var c in s.claim) {
                if (!s.claim.hasOwnProperty(c))
                    continue;

                offset += buf.write(c.toLowerCase(), offset); // Default UTF8
                offset += buf.write(s.claim[c].toString().toLowerCase(), offset);
            }
            offset = buf.writeInt32LE(s.cost, offset);
            offset = buf.writeInt32LE(s.activate, offset);
            offset = buf.writeInt32LE(s.expire, offset);
            offset += buf.write(s.scope.toLowerCase(), offset);
        }

        var data = new tce.buffer.Buffer(offset);
        buf.copy(data, 0, 0, offset);
        trust.trustid = tce.bitcoin.crypto.hash256(data); 
    }*/

    return PackageBuilder;
}())