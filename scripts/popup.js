(function(window, undefined) {
    var LIPSUM = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctu.",
        LIPSUM_LENGTH = LIPSUM.length,
        LIPSUM_MAX_MATCH_RATIO = 0.1;

    var document = window.document,
        settings,
        api,
        handlers;

    settings = {
        REGEX_FLAGS: 'gi',
        TYPE_TIMEOUT_MS: 0,
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
            var regex;
            
            try {
                regex = new RegExp(string, settings.REGEX_FLAGS);

                // Safeguard to prevent infinite matches.
                if ( regex.test('') ) {
                    throw "Regex matches empty string";
                }

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
            var lipsum,
                value = this.textInputElement.value;
            console.log('onKeyPress', e);

            if ( value == this.lastTextValue ) {
                return;
            }

            clearTimeout(this.timeoutObject);

            if ( !value ) {
                this.onTextChange();
            } else if ( api.validateRegex(value) ) {
                this.textInputElement.classList.remove('invalid-regex');

                // Used to ensure the regex doesn't match too much.
                lipsum = LIPSUM.match(new RegExp(value, 'gi'));
                console.log('lipsum', lipsum);

                if ( !lipsum || ((lipsum.length / LIPSUM_LENGTH) <= LIPSUM_MAX_MATCH_RATIO) ) {

                    console.log('good regex');

                    this.timeoutObject = setTimeout(function() {
                        this.onTextChange();
                    }.bind(this), settings.TYPE_TIMEOUT_MS);
                }
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

            port.onMessage.addListener(function( message ) {
                var textInputElement = handlers.textInputElement;
                console.log('message received', message);
                if ( textInputElement ) {
                    if ( message.matched ) {
                        textInputElement.classList.add('regex-matched');
                    } else {
                        textInputElement.classList.remove('regex-matched');
                    }
                }
            });

            chrome.commands.onCommand.addListener(commandHandler);
        });

        // Inject the content script
        chrome.tabs.executeScript(null,
            {
                file: 'scripts/inject.js'
            });
    })();

})(this);
