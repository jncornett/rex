(function(window, undefined) {
    var document = window.document,
        settings,
        api,
        handlers;

    settings = {
        REGEX_FLAGS: 'g',
        TYPE_TIMEOUT_MS: 100,
    };


    api = {
        sendSearch: function( port, searchString ) {
            console.log('api.sendSearch', searchString);
            port.postMessage({
                search: {
                    regex: searchString,
                    flags: settings.REGEX_FLAGS
                }
            });
        },

        sendClear: function( port ) {
            console.log('api.sendClear');
            port.postMessage({
                clear: true
            });
        },

        selectNext: function( port, forward ) {
            port.postMessage({
                hilight: {
                    direction: forward? true: false
                }
            });
        },

        validateRegex: function( string ) {
            try {
                new RegExp(string, settings.REGEX_FLAGS);
            } catch( e ) {
                return false;
            }

            return true;
        }
    };

    handlers = {
        textInputElement: undefined,
        lastTextValue: '',
        timeoutObject: undefined,
        contentPort: undefined,
        onTextChange: function() {
            var value = this.textInputElement.value;

            console.log('onTextChange', value);

            // Cancel any pending timeouts
            clearTimeout(this.timeoutObject);

            if ( value && api.validateRegex(value) ) {
                // Regex is good
                api.sendSearch(this.contentPort, value);
            } else {
                api.sendClear(this.contentPort);
            }
        },

        onKeyPress: function( e ) {
            var value = this.textInputElement.value;
            console.log('onKeyPress', e);

            if ( value == this.lastTextValue ) {
                return;
            }

            clearTimeout(this.timeoutObject);

            if ( !value || api.validateRegex(value) ) {
                this.textInputElement.classList.remove('invalid-regex');
                this.timeoutObject = setTimeout(function() {
                    this.onTextChange();
                }.bind(this), settings.TYPE_TIMEOUT_MS);
            } else {
                this.textInputElement.classList.add('invalid-regex');
            }

            this.lastTextValue = value;
        }
    };

    (function() {
        // Start listening for a connection from the content script
        chrome.runtime.onConnect.addListener(function( port ) {
            var commandHandler = function( command ) {
                console.log(command);
                if ( command == 'select-next-match' ) {
                    api.selectNext(port, true);
                }
            };

            console.log('Received connection on port', port);

            port.onDisconnect.addListener(function() {
                console.log('port Disconnected');
                if ( handlers.textInputElement ) {
                    handlers.textInputElement.onkeyup = handlers.textInputElement.onchange = undefined;
                }
                chrome.commands.onCommand.removeListener(commandHandler);

                // Attempt to reconnect
                setTimeout(function() {
                    chrome.tabs.executeScript(null, {file: 'scripts/inject.js'});
                }, 100);
            });

            handlers.contentPort = port;
            handlers.textInputElement = document.getElementById('main-input-box');
            handlers.textInputElement.onkeyup = handlers.onKeyPress.bind(handlers);
            handlers.textInputElement.onchange = handlers.onTextChange.bind(handlers);

            chrome.commands.onCommand.addListener(commandHandler);
        });

        // Inject the content script
        chrome.tabs.executeScript(null,
            {
                file: 'scripts/inject.js'
            });
    })();

})(this);
