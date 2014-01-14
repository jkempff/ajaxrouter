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
        navigation: '#nav',
        content: '#content',
        contextSelector: 'body',
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

    function _getOption(scope, key) {
        return scope.options[key];
    }

    function _setNavigation(scope, selector) {
        _setOptions.call(scope.options, {
            navigation: selector
        });
        return this;
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

    function _navigate(scope, element) {
        var that = this,
            url = element.attributes['data-href'] || element.href,
            title = element.attributes['data-title'] || element.innerText;

        /// TBD
        history.pushState({}, title, url);

        _setDocumentTitle(title);

        $(scope.options.contextSelector).addClass(scope.options.loadingClass);

        url += '?' + scope.options.ajaxUrlParm + '=true';

        _doRequest(url, function (xhr) {
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

        }, function() {
            console.log('error', arguments);
        });
    }

    function _initialize(scope) {
        if (scope.isInitialized) {
            return _reInitialize(scope);
        }

        scope.isInitialized = true;
        return this;
    }

    function _reInitialize(scope) {
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

        $('a', $context).filter(function () {
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

        $('.' + scope.options.activeClass).removeClass(scope.options.activeClass);
        $(this).addClass(scope.options.activeClass);

        if (_isInternal(element.href)) {
            e.preventDefault();
            _navigate.call(this, scope, element);
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
            onSuccess(xhr, result);
        };
        xhr.send();
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
                return fn.apply(_public, [_private].concat(slice.call(arguments, -1)))
            };
        }

        _public = $.extend(_public, {
            navigation: makeMine(_setNavigation),
            content: makeMine(_setContent),
            get: makeMine(_getOption),
            contentToggle: makeMine(_onContentToggle),
            watch: makeMine(_initialize),
            each: makeMine(_addBehavior)
        });

        // Fetch all click events of internal links
        _initContent.call(_public, _private);

        _public.each(function () {
            _initContent.call(this, _private);
        });

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