var phantom = require('phantom');
/*
phantom.create ('--cookies-file=cookie2.txt', function(ph){
    ph.get('version', function(info){
        console.log(info);
    });


    ph.createPage(function(page){
        page.get('settings.loadImages', function(info){
            console.log(info);
        });

        page.open("http://www.weibo.com", function(status){
            //console.log("opened google? " + status);
            if(status=="success") {
                page.injectJs('jquery-1.7.2.min.js');
                page.evaluate(function(){
                    $("#login_form input.name").val('18602283721');
                    $("#login_form input.pass").val('113456');
                    //$("#login_form div.W_login div.btn a.W_btn_d").trigger('click');
                    var ev = document.createEvent('MouseEvents');
                    ev.initEvent('click', false, true);
                    $(".W_btn_d")[0].dispatchEvent(ev);

                    return document.title+$(".W_btn_d").text();
                }, function(result){
                    console.log(result);
                    ph.exit();
                });
            }

        });

    });
});
*/

var WeiboSinaFactory = {
    create : function(username, password, size, config, callback){
        phantom.create('--cookies-file=cookie2.txt', function(ph){
            var pages = [];
            for(var i=0;i<size;i++) {
                (function(index){
                    ph.createPage(function(page){
                        page.set('settings.loadImages', false);
                        console.log(index);
                        pages.push( new WeiboSina(index, username, password, page, ph, config) );
                    });
                })(i);
            }

            callback(new PageUpstream(pages));
        });
    }
};

function PageUpstream(pages) {
    var _self = this;
    var _counter = 0;
    _self.open = function(url, callback){
        _counter++;
        var index = _counter%pages.length;
        console.log("Use Page :"+index);
        pages[index].open(url, callback);
    }
}



function WeiboSina(page_number, username, password, page, ph, config) {
    var _self = this;
    var _is_login = false;
    var _open_list = [];
    var _is_openning = false;

    page.set('onConsoleMessage', function (msg) {
        console.log('onConsoleMessage:'+msg);
    });
    page.set('onLoadFinished', function (msg) {
        //console.log('onLoadFinished');
    });
    page.set('onResourceRequested', function (msg) {
        //console.log('onResourceRequested');
    });

    function _log(obj) {
        console.log((new Date())+' ['+page_number+'] '+obj);
    }

    _self.open = function(url, callback){
        if(_is_login==true && _is_openning==false) {
            _is_openning = true;
            _log('open url:'+url);

            var run_next = function() {
                _is_openning = false;
                _openNext();
            }

            _openPage(page, url, callback, run_next);
        }
        else {
            _log('加入队列:'+url);
            _pushToOpenList(url, callback);
        }
    }

    function _openPage(page, url, userCallback, nextPageCallback) {
        var is_call = false;

        //设置超时。
        setTimeout(function(){
            if(is_call==false) {
                is_call = true;

                //回调用户定义函数，并给出超时标记，对应方法都不可用
                userCallback({
                    timeout:true,
                    evaluate : function(){
                        _log('evaluate 方法不可用，已超时。');
                    }
                }, function(){});

                nextPageCallback();
            }

        },10000||config.timeout);

        page.open(url, function(status) {
            if(status=='success') {
                //避免一个请求页面被回调两次
                if(is_call==true) {
                    nextPageCallback();
                    return;
                }
                is_call = true;

                //注入jquery
                page.injectJs('script/jquery-1.7.2.min.js');
                //console.log('opened url:'+url);

                //回调用户自定义的方法
                userCallback({
                    timeout:false,
                    evaluate : function(evaluate,cb){
                        return page.evaluate(evaluate,cb);
                    }
                }, nextPageCallback);
            }
            else {
                //retry
                nextPageCallback();
                //console.log('open url fail:'+url);
            }
        });
    }

    function _openNext() {
        _log('Open Next URL:'+_open_list.length);
        if(_is_openning==false) {
            var obj;
            if(obj=_open_list.shift()) {
                //console.log(obj);
                _self.open(obj.url, obj.callback);
            }
        }
    }

    //登录
    function _doLogin(callback) {
        _log('begin _doLogin\n');
        //page.injectJs('jquery-1.7.2.min.js');
        var fstr = "window.xusername = '"+username+"'; window.xpassword = '"+password+"';";
        var f = new Function(fstr);
        page.evaluate(f, function(){
            _log("设置用户名，密码。");
        });

        page.evaluate(function(){
            try {
                $("#login_form input.name").val(window.xusername);
                $("#login_form input.pass").val(window.xpassword);
                var ev = document.createEvent('MouseEvents');
                ev.initEvent('click', false, true);
                $(".W_btn_d")[0].dispatchEvent(ev);

                return "none";
            }
            catch(e) {
                return e;
            }

            //return $("#login_form").html();
            return 'ddd';
        }, function(result){
            //console.log(result);
            setTimeout(function(){
                _isLogin(callback);
            }, 2000);
            //ph.exit();
        });
    }

    //判断是否登录
    function _isLogin(callback) {
        _log('call _isLogin.');

        var is_callbacked = false;
        page.open("http://weibo.com", function(status){
            //console.log("opened google? " + status);
            if(is_callbacked==true) {
                return;
            }
            is_callbacked = true;
            if(status=="success") {
                page.injectJs('script/jquery-1.7.2.min.js');
                page.evaluate(function(){
                    //return $(".W_btn_d").text();
                    try {
                        return $(".W_btn_d")[0].tagName=="A";
                    }
                    catch(e) {
                        return false;
                    }
                }, function(result){
                    //console.log(result);
                    //如果有登录提示
                    if(result==true) {
                        _doLogin(callback);
                    }
                    else {
                        _is_login = true;
                        //console.log(result+'+++++++++++++');

                        callback('_isLogin');
                    }

                    //ph.exit();
                });
            }
            else {
                console.log('_isLogin:Fail.');
            }

        });
    }

    function _pushToOpenList(url, callback) {
        _open_list.push({
            url : url,
            callback : callback
        });
    }

    _isLogin(function(){
        _is_login = true;
        _log('登录成功');

        setInterval(function(){
            _openNext();
        }, config.check_interval);

        setInterval(function(){
            _log("保持Session.");
            _self.open('http://weibo.com', function(obj, nextPage){
                nextPage();
                return "";
            });
        }, config.breakheart);
    });
}

exports.WeiboSinaFactory = WeiboSinaFactory;