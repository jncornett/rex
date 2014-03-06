var rex = (function ( global, undefined ) {
    var NodeFilter = global.NodeFilter,
        FILTER_ACCEPT = NodeFilter.FILTER_ACCEPT,
        document = global.document,

        _is_visible,
        _span,
        _make_rex_element,

        _find_all,
        _ifilter_by_regexp;



    // Make a <span> element with a class className and 
    // append `children to it.
    _span = function( contents, className, children ) {
        var element = document.createElement('span');

        element.textContent = contents;

        if ( className ) {
            element.className = className;
        }

        if ( children ) {
            children.forEach(function( child ) {
                element.appendChild(child);
            });
        }

        return element;
    };

    _find_all = function( regex, string, callback ) {
        var match, lastIndex = undefined;

        while ( (match = regex.exec(string)) && 
                (lastIndex != (lastIndex = match.index)) ) {
            callback(match);
        }
    };

    _ifilter_by_regexp = function( regex, callback ) {
        var node,
            walker,
            matches = [];

        walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            { 
                acceptNode: function( node ) {
                    if ( node.nodeValue.trim() ) {
                        return FILTER_ACCEPT;
                    }
                } 
            },
            false
        );

        while ( node = walker.nextNode() ) {
            _find_all(regex, node.nodeValue, function( match ) {
                matches.push(match);
            });

            if ( matches.length ) {
                callback(node, matches);
                matches = [];
            }
        }
    };

    _make_rex_element = function( node, matches ) {
        var container = _span('', 'rex-container'),
            text = node.nodeValue,
            lastIndex = 0;

        matches.forEach(function( match ) {
            var curIndex = match.index;

            // If there's a gap between matches in a textNode, fill it in
            // with a textNode.
            if ( curIndex > lastIndex ) {
                container.appendChild(
                    document.createTextNode(text.substring(curIndex, lastIndex))
                );
            }
            
            container.appendChild(
                _span(match[0], 'rex-match')
            );

            lastIndex = curIndex + match[0].length;
        });

        // If there's a gap between the last match and the end of the text node,
        // fill it in with a substring textNode
        if ( lastIndex < text.length - 1 ) {
            container.appendChild(
                document.createTextNode(text.substring(lastIndex))
            );
        }

        node.parentNode.replaceChild(container, node);
        container.appendChild(_span('', 'rex-reversion', [node]));

        return container;
    };

    global.rex = {
        regexForEach: _ifilter_by_regexp,
        makeRexElement: _make_rex_element
    };

    return global.rex;
})(this);