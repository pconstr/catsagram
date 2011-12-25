/* Copyright 2010-2011, Carlos Guerreiro
 * Licensed under the MIT license */

var catURL = '/latestCatPhotos';

var context = {
    userWebsite: function(d) {
	var ws = d.user.website;
	if(ws === '') {
	    return undefined;
	}
	return ws;
    },

    isBusy: false,

    start: function() {
	this.isBusy = true;
    },

    finish: function() {
	this.isBusy = false;
    },

    photo: {
	preInsertSequence: function(e, finished) {
	    $(e).hide();
	    $(e).fadeTo(0, 0);
	    finished();
	},
	postInsertSequence: function(e, finished) {
	    $(e).hide();
	    $(e).find('img').imagesLoaded(function(img) {
		// jQuery on Firefox needs some reminding here. weird...
		jQuery._data(e, "olddisplay", "inline-block");

		$(e).show(300, function() {
		    $(e).fadeTo(300, 1, finished);
		});
	    });
	},
	preRemoveSequence: function(e, finished) {
	    $(e).fadeTo(300, 0, function() {
		$(e).hide(300, finished);
	    });
	}
    },

    comment: {
	preInsertSequence: function(e, finished) {
	    $(e).hide();
	    finished();
	},
	postInsertSequence: function(e, finished) {
	    $(e).show(300, finished);
	},
	preRemoveSequence: function(e, finished) {
	    $(e).hide(300, finished);
	}	
    }
};

//context.comment = context.photo;

var graft = null;
var displayedLength = 0;
var latestData = [];

function doUpdate() {
    if(context.isBusy) {
	setTimeout(doUpdate, 100);
    } else {
	graft.update(latestData.slice(latestData.length >= displayedLength ? latestData.length - displayedLength : 0));
    }
}

function getUpdate() {
    $.getJSON(catURL, function(msg) {
	latestData = msg;
	doUpdate();
    });    
}

function dimension() {
    displayedLength = Math.floor(($(window).width() - 20)/ 195);
    if(displayedLength < 1) {
	displayedLength = 1;
    }
}

jQuery(document).ready(function() {
    var resizeTimer = null;
    dimension();

    graft = data_graft.germ([], $('#template')[0], context);
    $('#output').append(graft.output);
    getUpdate();
    window.setInterval(getUpdate, 5000);

    $(window).resize(function() {
	if(resizeTimer !== null) {
	    clearTimeout(resizeTimer);
	}
	resizeTimer = window.setTimeout(function() {
	    dimension();
	    doUpdate();
	}, 500);
    });
});
