///<reference path="../typings/globals/jquery/index.d.ts" />

var TagBar = (function () {


    // Constructor
    function TagBar(subject, settings, packageBuilder) {
        this.subject = subject;
        this.$elements = [];
        this.$container = $('<span />');
        this.settings = settings;
        this.packageBuilder = packageBuilder;
    }

    // Instance methods
    TagBar.prototype.update = function(networkScore, personalScore) {
        if (this.$neutralLink && personalScore === 0)) {
            this.$neutralLink.hide();
        } else {
            this.$neutralLink.show();
        }
        
        if (this.$trustLink && personalScore > 0) {
            this.$trustLink.removeAttr("href");
        } else {
            this.$trustLink.attr('href', 'javascript:void 0');
        }

        if (this.$distrustLink && personalScore < 0) {
            this.$distrustLink.removeAttr("href");
        } else {
            this.$distrustLink.attr('href', 'javascript:void 0');
        }


        if (this.$trusticon && networkScore === 0) {
             this.$trusticon.hide();
        } else {
            this.$trusticon.show();
            if(networkScore > 1) {
                this.$trusticon.attr('src', 'check16.png');
            } else {
                this.$trusticon.attr('src', 'close16.png');
            }
        }
            

    }

    TagBar.prototype.render = function(htmlElement) {
        let $htmlElement = $(htmlElement);
        if(!$htmlElement.data(this.TAGBAR_NAME)) return;

        if(this.$container.length === 0) {
            this.$identicon = this.createIdenticon(this.subject, "Analyse "+subject.author);
            this.$trustLink = this.createButton('link', "Trust "+event.detail.data.author, "T");
            this.$distrustLink = this.createButton('link', "Distrust "+event.detail.data.author, "D");
            this.$neutralLink = this.createButton('link', "Neutral "+event.detail.data.author, "N");
            this.$trusticon = this.createIcoin("check16.png");
        }
        $htmlElement.append(this.$container);
        $htmlElement.data(this.TAGBAR_NAME, true);
    }
    
    TagBar.prototype.createButton = function(type, title, text, event) {
        let $element = null;
        switch (type) {
            case 'text' : $element = $("<b title='"+title+"'>["+text+"]</b>"); break;
            case 'link' : $element = $("<a title='"+title+"' href='javascript:void 0'>["+text+"]</a>");
        }
        if (type !== 'text') {
            $element.on('click', event);
        }
        this.$container.append($element);
        return $element;
    }

    TagBar.prototype.createIdenticon = function(subject, title) {
        var data = new Identicon(subject.address.toString('HEX'), {margin:0.1, size:16, format: 'svg'}).toString();
        var $alink = $('<a title="'+title+'" href="#"><img src="data:image/svg+xml;base64,' + data + '"></a>');
        $alink.data("subject", subject);
        $alink.click(function() {
            var opt = {
                command:'openDialog',
                url: 'trustlist.html',
                data: $(this).data("subject")
            };
            opt.w = 800;
            opt.h = 800;
            var wLeft = window.screenLeft ? window.screenLeft : window.screenX;
            var wTop = window.screenTop ? window.screenTop : window.screenY;
    
            opt.left = Math.floor(wLeft + (window.innerWidth / 2) - (opt.w / 2));
            opt.top = Math.floor(wTop + (window.innerHeight / 2) - (opt.h / 2));
            
            chrome.runtime.sendMessage(opt);
            return false;
        });
        this.$container.append($alink);
        return $alink;
    }

    TagBar.prototype.createIcoin = function(name) {
        var imgURL = chrome.extension.getURL("img/"+name);
        var $img = $('<img src="' + imgURL + '">');

        this.$container.append($img);
        return $img;
    }

    // Static methods
    TagBar.bind = function(subject, event, settings, packageBuilder) {
        let instance = this.instances[subject.author];
        if(!instance) {
            instance = new TagBar(subject, settings, packageBuilder);
            this.instances[subject.author] = instance;
        }

        instance.render(event.htmlElement);

        return instance;
    }
    
    // Static properties
    TagBar.TAGBAR_NAME = 'reddittagbar';
    TagBar.instances = [];

    return TagBar;
}());
