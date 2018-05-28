///<reference path="../typings/globals/jquery/index.d.ts" />

var TagBar = (function () {
    function TagBar(parent) {
        this.elements = [];
        this.parentElement = $(parent);
    }

    TagBar.prototype.createButton = function(type, title, text, event) {
        let element = null;
        switch (type) {
            case 'text' : element = $("<b title='"+title+"'>["+text+"]</b>"); break;
            case 'link' : element = $("<a title='"+title+"' href='javascript:void 0'>["+text+"]</a>");
        }
        if (type !== 'text') {
            element.on('click', event);
        }
        this.elements.push(element);
        return element;
    }

    TagBar.prototype.render = function() {
        for(const element of this.elements) {
            this.parentElement.append(element);
        }
    }


    return TagBar;
}());
