/** 
 * AjaxRouter Plugin
 * 
 * Makes Ajaxified Minipages as simple
 * as they should be
 *
 */
;(function (factory) {
    var name,
        version,
        $,
        Module,
        defaultOptions,
        slice,
        hostRegExp;

    if (!this.jQuery) throw new Error('AjaxRouter requires jQuery');
    if (typeof location === 'undefined' && !location.origin) throw new Error('Aint no host');

    $ = this.jQuery;

    name = 'AjaxRouter';
    version = '0.0.1';

    slice = Array.prototype.slice;
    hostRegExp = new RegExp(location.origin);

    defaultOptions = {
        content: '#content',
        contextSelector: 'body',
        linkSelector: 'a',
        loadingClass: 'loading',
        activeClass: 'active',
        activeTrailClass: 'active-trail',
        ajaxUrlParm: 'isAjax'
    };

    // Methods
    function _setOptions(options) {
        var i;
        for (i in options) {
            if (defaultOptions.hasOwnProperty(i)) {
                this[i] = options[i];
            }
        }
    }

    function _setOption(scope, key, value) {
        if (typeof key === 'object') {
            _setOptions.call(scope.options, key);
        } else {
            var option = {};
            option[key] = value;
            _setOptions.call(scope.options, option);
        }
    }

    function _getOption(scope, key) {
        return scope.options[key];
    }

    function _setContent(scope, selector) {
        _setOptions.call(scope.options, {
            content: selector
        });
        return this;
    }

    function _setDocumentTitle(title) {
        if (typeof document !== 'undefined') document.title = title;
    }

    function _getDocumentHref() {
        return (typeof document !== 'undefined') ? document.location.href : '';
    }

    function _isCurrentLocation(href) {
        return new RegExp("(.*)" + href + '$').test(document.location.href);
    }

    function _replaceContent(selector, $newContent) {
        $(selector).html($newContent);
    }

    function _navigate(scope, state, push) {
        var that = this;

        if (push) {
            history.pushState(state, state.title, state.url);
        }

        
        $('.' + scope.options.activeClass).removeClass(scope.options.activeClass);
        $(this).addClass(scope.options.activeClass);

        _setDocumentTitle(state.title);

        $(scope.options.contextSelector).addClass(scope.options.loadingClass);

        state.url += '?' + scope.options.ajaxUrlParm + '=true';

        if (scope.xhr) {
            scope.xhr.abort();
        }

        scope.xhr = _doRequest(state.url, function (xhr) {
            var i = 0,
                l = scope.behaviors.length,
                $response = $(xhr.responseText),
                $content = $response.filter(scope.options.content).children(),
                $title = $response.filter('title').first();
            
            if ($title.length) {
                _setDocumentTitle($title.text());
            }

            scope.onContentToggle(scope.options.content, $content);

            for (; i < l; i++) {
                scope.behaviors[i].call(that, $content);
            }

            $(scope.options.contextSelector).removeClass(scope.options.loadingClass);

            delete scope.xhr;
        }, function(e) {
            if (!e.type === 'abort') {
                console.log('error', arguments);
            }
        });
    }

    function _initialize(scope) {
        if (scope.isInitialized) {
            return _reInitialize.call(this, scope);
        }

        scope.isInitialized = true;
        return this;
    }

    function _reInitialize(scope) {
        _initContent.call(this, scope);
        return this;
    }

    function _initContent(scope, $context) {
        var that = this,
            $context = $context || $(scope.options.contextSelector);

        function _linkIsAlreadyInitialized() {
            if (!this._ajaxRouterInit) {
                this._ajaxRouterInit = true;
                return true;
            }
            return;
        }

        $(scope.options.linkSelector, $context).filter(function () {
            var href = $(this).attr('href');

            if (href && _isCurrentLocation(href)) {
                if ($(this).parent().is('li')) {
                    $(this).parent().addClass(scope.options.activeClass);
                } else {
                    $(this).addClass(scope.options.activeClass);
                }
            }

            return _linkIsAlreadyInitialized.call(this) && _isInternal(this['data-href'] || this.href);
        }).click(function (e) {
            _navLinks_onClick.call(that, this, scope, e);
        });
    }

    function _initPushState(scope) {
        if (typeof window === 'object' && 'onpopstate' in window) {
            window.addEventListener('popstate', function (e) {
                if (e.state) {
                    _navigate.call(this, scope, e.state);
                }
            });
        }
    }

    function _addBehavior(scope, fn) {
        scope.behaviors.push(fn);
        return this;
    }

    function _navLinks_onClick(element, scope, e) {        
        var href = element.attributes.href.value;

        if (_isCurrentLocation(href) || $(this).hasClass(scope.options.activeClass)) {
            e.preventDefault();
            return;
        }

        if (_isInternal(element.href)) {
            e.preventDefault();
            _navigate.call(this, scope, {
                url: element.attributes['data-href'] || element.href,
                title: element.attributes['data-title'] || element.innerText
            }, true);
            return;
        }
    }

    function _isInternal(url) {
        return hostRegExp.test(url);
    }

    function _onContentToggle(scope, fn) {
        scope.onContentToggle = fn;
        return this;
    }

    function _doRequest(url, onSuccess, onError, method, async) {
        var xhr = new XMLHttpRequest();
        xhr.open(method || 'GET', url, async || true);
        xhr.onerror = xhr.onabort = onError;
        xhr.onload = function (result) {
            
            if (xhr.getResponseHeader('Content-Type') === 'text/html') {
                return onSuccess(xhr, result);
            }

            document.location.reload();
        };
        xhr.send();

        return xhr;
    }

    // Module constructor
    Module = function (options) {
        var that = this,
            _public = {},
            _private = {
                options: {},
                behaviors: [],
                onContentToggle: _replaceContent
            };

        _setOptions.call(_private.options, defaultOptions);

        if (options) {
            _setOptions.call(_private.options, options);
        }

        function makeMine(fn) {
            return function () {
                return fn.apply(_public, [_private].concat(slice.call(arguments)))
            };
        }

        _public = $.extend(_public, {
            setOption: makeMine(_setOption),
            getOption: makeMine(_getOption),
            contentToggle: makeMine(_onContentToggle),
            watch: makeMine(_initialize),
            each: makeMine(_addBehavior),
            update: makeMine(_initialize)
        });

        // Fetch all click events of internal links
        _initContent.call(_public, _private);

        _public.each(function () {
            _initContent.call(this, _private);
        });

        _initPushState.call(_public, _private);

        return _public;
    };

    factory(name, version, function () {
        return function (options) {
            return new Module(options);
        };
    });

}(function (name, version, definition) {
    var theModule = definition(),
        // this is considered "safe":
        hasDefine = typeof define === 'function' && define.amd,
        // hasDefine = typeof define === 'function',
        hasExports = typeof module !== 'undefined' && module.exports;

    theModule.version = version;

    if (hasDefine) { // AMD Module
        define(function () {
            return theModule;
        });
    } else if (hasExports) { // CommonJS Module
        module.exports = theModule;
    } else { // Assign to common namespaces or simply the global object (window)
        (this.jQuery || this.$ || this)[name] = theModule;
    }
}));