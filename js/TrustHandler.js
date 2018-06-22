///<reference path="../typings/globals/jquery/index.d.ts" />

var TrustHandler = (function() {
    function TrustHandler(package, settings) {
        if(!package) 
            package = { trusts: [] };

        this.settings = settings;
        this.package = package;
        this.subjects = [];
        this.BuildSubjects();

    }

    TrustHandler.prototype.BuildSubjects = function() {
        if(!this.package.trusts)
            return;

        for(var trustIndex in this.package.trusts)
        {
            var trust = this.package.trusts[trustIndex];
            trust.attributesObj = JSON.parse(trust.claim);

            var list = this.subjects[trust.subject.address];
            if(!list) {
                list = []
                this.subjects[trust.subject.address] = list;
            } 

            list[trust.issuer.address] = trust;
        }
    }


    TrustHandler.prototype.CalculateBinaryTrust = function(subjectAddressBase64, ownerAddressBase64) {
        var self = this;
        var result = {
            direct : false,
            directValue: undefined,
            trust : 0,
            distrust: 0,
        };

        var binaryTrustCount = 0;
        
        var subjectTrusts = self.subjects[subjectAddressBase64];
        var ownerTrusts = self.subjects[ownerAddressBase64];
        if(!subjectTrusts && !ownerTrusts)
            return result;

        function CalcTrust(trusts) {
            if(!trusts) return;
            for(var i in trusts) {
                var trust = subjectTrusts[i];
                if(trust.type === PackageBuilder.BINARYTRUST_TC1) {
                    binaryTrustCount ++;

                    if(trust.attributesObj.trust === true) 
                        result.trust++;
                    else
                        result.distrust++;
                                    // IssuerAddress is base64
                    if(trust.issuer.address == self.settings.publicKeyHashBase64)
                    {
                        result.direct = true;
                        result.directValue = trust.attributesObj.trust;
                    }
                }
            }
        }
        CalcTrust(ownerTrusts);
        if(result.trust == 0 && result.distrust == 0)
            CalcTrust(subjectTrusts);   

        //result.trustPercent = Math.floor((result.isTrusted * 100) / binaryTrustCount);
        result.state = result.trust - result.distrust;

        return result;
    }

    TrustHandler.prototype.CalculateBinaryTrust2 = function(subjectAddressBase64, ownerAddressBase64) {
        var self = this;
        var result = {
            networkScore : 0,
            personalScore: 0,
        };
        //var binaryTrustCount = 0;
        
        var subjectTrusts = self.subjects[subjectAddressBase64];
        var ownerTrusts = self.subjects[ownerAddressBase64];
        if(!subjectTrusts && !ownerTrusts)
            return result;

        function CalcTrust(trusts) {
            if(!trusts) return;
            for(const key in trusts) {
                const trust = trusts[key];

                if(trust.type != PackageBuilder.BINARYTRUST_TC1)
                    continue;

                //binaryTrustCount ++;

                if(trust.issuer.address == self.settings.publicKeyHashBase64) { // Its your trust!
                    result.personalScore += (trust.attributesObj.trust) ? 1 : -1;
                } else {
                    result.networkScore += (trust.attributesObj.trust) ? 1 : -1;
                }
            }
        }
        CalcTrust(subjectTrusts);   
        CalcTrust(ownerTrusts);
        
        if (result.personalScore != 0) {
            result.networkScore = result.personalScore;
        }

        //result.trustPercent = Math.floor((result.networkScore * 100) / binaryTrustCount);

        return result;
    }

    return TrustHandler;
}());