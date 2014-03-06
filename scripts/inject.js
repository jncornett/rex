(function(window, undefined) {
    var executeSearch,
        isVisible,
        revertTags,
        cleanup,
        unSelect,
        select,
        curIndex,
        rexElements,
        selectables,
        port,
        document = window.document;

    executeSearch = function( string, flags ) {
        console.log('execute search', string, flags);
        var regex = new RegExp(string, flags);
        rexElements = [];
        rex.regexForEach(regex, function( node, matches ) {
            console.log('node', node, matches);
            if ( isVisible(node) ) {
                console.log('visible');
                rexElements.push(rex.makeRexElement(node, matches));
            }
        });

        if ( rexElements.length ) {
            selectables = document.getElementsByClassName('rex-match');
            select(curIndex = 0);
        } else {
            rexElements = selectables = curIndex = undefined;
        }

        console.log('completed executeSearch');
    };

    isVisible = function( textNode ) {
        var rect,
            parent = textNode.parentElement;

        if ( parent && 
             (parent.offsetWidth > 0) && 
             (parent.offsetHeight > 0) &&
             (parent.clientHeight > 0) &&
             (parent.clientWidth > 0) ) {
            
            return true;

        }
    };

    revertTags = function() {
        if ( rexElements ) {
            rexElements.forEach(function( container ) {
                var node = container.getElementsByClassName('rex-reversion')[0];
                container.removeChild(node);
                container.parentElement.replaceChild(
                    document.createTextNode(node.textContent),
                    container
                );
            });
        }

        rexElements = selectables = curIndex = undefined;
    };

    cleanup = function() {
        revertTags();
    };

    unSelect = function( index ) {
        selectables[index].classList.remove('rex-active');
    };

    select = function( index ) {
        var selected = selectables[index];

        selected.classList.add('rex-active');
        selected.scrollIntoView();

    };

    port = chrome.runtime.connect();
    
    port.onDisconnect.addListener(function() {
        cleanup();
    });

    port.onMessage.addListener(function( msg ){
        if ( msg.search ) {
            revertTags();
            executeSearch(msg.search.regex, msg.search.flags);
            console.log('ok, posting length', (rexElements || {}).length);
            port.postMessage({
                matched: (rexElements || {}).length > 0
            });
        } else if ( msg.hilight && rexElements.length ) {
            unSelect(curIndex);
            curIndex = (curIndex + msg.hilight.direction) % rexElements.length;
            select(curIndex);
        } else if ( msg.clear ) {
            revertTags();
            port.postMessage({
                matched: false
            });
        }

        console.log('length', rexElements.length);
    });

})(this);