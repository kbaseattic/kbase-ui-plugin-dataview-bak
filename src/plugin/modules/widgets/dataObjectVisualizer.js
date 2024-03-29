/*global
 define, require, console, document
 */
/*jslint
 browser: true,
 white: true
 */
define([
    'jquery',
    'bluebird',
    'underscore',
    'kb_service_workspace',
    'kb_common_html',
    'kb_service_utils'
],
    function ($, Promise, _, Workspace, html, APIUtils) {
        "use strict";

        function factory(config) {
            var mount, container, $container, runtime = config.runtime,
                theWidget, widgetContainer, panelInstalled;


            function findMapping(type, params) {
                // var mapping = typeMap[objectType];
                var mapping = runtime.getService('type').getViewer({type: type});
                if (mapping) {
                    if (params.sub && params.subid) {
                        if (mapping.sub) {
                            if (mapping.sub.hasOwnProperty(params.sub)) {
                                mapping = mapping.sub[params.sub]; // ha, crazy line, i know.
                            } else {
                                throw new Error('Sub was specified, but config has no correct sub handler, sub:' + params.sub + "config:");
                            }
                        } else {
                            throw new Error('Sub was specified, but config has no sub handler, sub:' + params.sub);
                        }
                        //} else {
                        //    console.error('Something was in sub, but no sub.sub or sub.subid found', params.sub);
                        //    return $('<div>');
                    }
                }
                return mapping;
            }

            // TODO: move this to api utils
            function makeObjectRef(obj) {
                return [obj.workspaceId, obj.objectId, obj.objectVersion].filter(function (element) {
                    if (element) {
                        return true;
                    }
                }).join('/');
            }

            function makeWidget(params) {
                // Translate and normalize params.
                // params.objectVersion = params.ver;

                // Get other params from the runtime.
                return new Promise(function (resolve, reject) {
                    var workspace = new Workspace(runtime.getConfig('services.workspace.url'), {
                        token: runtime.getService('session').getAuthToken()
                    }),
                        objectRefs = [{ref: makeObjectRef(params)}];
                    Promise.resolve(workspace.get_object_info_new({
                        objects: objectRefs,
                        ignoreErrors: 1,
                        includeMetadata: 1
                    }))
                        .then(function (data) {
                            if (data.length === 0) {
                                reject('Object not found');
                                return;
                            }
                            if (data.length > 1) {
                                reject('Too many (' + data.length + ') objects found.');
                                return;
                            }
                            if (data[0] === null) {
                                reject('Null object returned');
                                return;
                            }

                            var wsobject = APIUtils.object_info_to_object(data[0]);
                            var type = APIUtils.parseTypeId(wsobject.type),
                                mapping = findMapping(type, params);
                            if (!mapping) {
                                reject('Not Found', 'Sorry, cannot find widget for ' + type.module + '.' + type.name);
                                return;
                            }
                            // These params are from the found object.
                            var widgetParams = {
                                workspaceId: params.workspaceId,
                                objectId: params.objectId,
                                objectName: wsobject.name,
                                workspaceName: wsobject.ws,
                                objectVersion: wsobject.version,
                                objectType: wsobject.type,
                                type: wsobject.type
                            };
                            
                            // handle sub
                            if (params.sub) {
                                widgetParams[params.sub.toLowerCase() + 'ID'] = params.subid;
                            }

                            // Create params.
                            if (mapping.options) {
                                mapping.options.forEach(function (item) {
                                    var from = widgetParams[item.from];
                                    if (!from && item.optional !== true) {
                                        throw 'Missing param, from ' + item.from + ', to ' + item.to;
                                    }
                                    widgetParams[item.to] = from;
                                });
                            }
                            // Handle different types of widgets here.
                            runtime.getService('widget').makeWidget(mapping.widget.name, mapping.widget.config)
                                .then(function (result) {
                                    resolve({
                                        widget: result,
                                        params: widgetParams,
                                        mapping: mapping
                                    });
                                })
                                .catch(function (err) {
                                    reject(err);
                                });

                        })
                        .catch(function (err) {
                            reject(err);
                        });
                });
            }

            function showError(err) {
                var content;
                console.log('ERROR');
                console.log(err);
                if (typeof err === 'string') {
                    content = err;
                } else if (err.message) {
                    content = err.message;
                } else if (err.error && err.error.error) {
                    content = err.error.error.message;
                } else {
                    content = 'Unknown Error';
                }
                container.innerHTML = html.bsPanel('Error', content);
            }

            // Widget Lifecycle Interface

            function attach(node) {
                return new Promise(function (resolve) {
                    mount = node;
                    container = document.createElement('div');
                    $container = $(container);
                    mount.appendChild(container);
                    resolve();
                });
            }

            var widgetParams;
            function start(params) {
                return new Promise(function (resolve, reject) {
                    var newParams;
                    makeWidget(params)
                        .then(function (result) {
                            theWidget = result.widget;
                            newParams = result.params;
                            widgetParams = result.params;
                            if (result.mapping.panel) {
                                var temp = container.appendChild(document.createElement('div')),
                                    widgetParentId = html.genId(),
                                    div = html.tag('div');
                                temp.innerHTML = html.makePanel({
                                    title: 'Data View',
                                    content: div({id: widgetParentId})
                                });
                                // These are global.
                                panelInstalled = true;
                                widgetContainer = document.getElementById(widgetParentId);
                            } else {
                                widgetContainer = container;
                            }
                            if (theWidget.init) {
                                return theWidget.init(config);
                            } else {
                                return null;
                            }
                        })
                        .then(function () {
                            return theWidget.attach(widgetContainer);
                        })
                        .then(function () {
                            return theWidget.start(newParams);
                        })
                        .then(function () {
                            // do nothing...
                            resolve();
                        })
                        .catch(function (err) {
                            // if attaching the widget failed, we attach a 
                            // generic error widget:
                            // TO BE DONE
                            showError(err);
                            reject(err);
                        });
                });
            }
            function run(params) {
                return Promise.try(function () {
                    return theWidget.run(params);
                });
            }
            function stop() {
                return new Promise(function (resolve, reject) {
                    if (theWidget && theWidget.stop) {
                        theWidget.stop()
                            .then(function () {
                                resolve();
                            })
                            .catch(function (err) {
                                reject(err);
                            });
                    } else {
                        resolve();
                    }
                });
            }
            function detach() {
                return new Promise(function (resolve, reject) {
                    if (theWidget && theWidget.detach) {
                        theWidget.detach()
                            .then(function () {
                                resolve();
                            })
                            .catch(function (err) {
                                reject(err);
                            });
                    } else {
                        resolve();
                    }
                });
            }
            function destroy() {
                return new Promise(function (resolve) {
                    if (theWidget && theWidget.destroy) {
                        theWidget.destroy()
                            .then(function () {
                                resolve();
                            })
                            .catch(function (err) {
                                reject(err);
                            });
                    } else {
                        resolve();
                    }
                });
            }

            return {
                attach: attach,
                start: start,
                run: run,
                stop: stop,
                detach: detach,
                destroy: destroy
            };
        }

        return {
            make: function (config) {
                return factory(config);
            }
        };
    });