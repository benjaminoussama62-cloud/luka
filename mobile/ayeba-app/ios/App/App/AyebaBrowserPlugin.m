#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(AyebaBrowserPlugin, "AyebaBrowser",
    CAP_PLUGIN_METHOD(open, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(close, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(setFrame, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(setHidden, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(loadUrl, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(goBack, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(goForward, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(goToIndex, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(reload, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(stop, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(evaluate, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(find, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clearFind, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(setDesktop, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(sslProceed, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(capture, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(saveTab, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(restoreTab, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(removeTab, CAPPluginReturnPromise);
)
