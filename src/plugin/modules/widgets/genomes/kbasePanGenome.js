/**
 * Ouput widget to display a pangenome object.
 * @author Chris Henry <chrisshenry@gmail.com>, Roman Sutormin <rsutormin@lbl.gov>
 * @public
 */
/*global
 define
 */
/*jslint
 browser: true,
 white: true
 */
define([
    'jquery',
    'kb_common_html',
    'kb_service_workspace',
    
    'kb_widgetBases_kbAuthenticatedWidget',
    'kb_widget_kbTabs',
    'datatables_bootstrap'
],
    function ($, html, Workspace) {
        'use strict';
        $.KBWidget({
            name: "kbasePanGenome",
            parent: "kbaseAuthenticatedWidget",
            version: "1.0.0",
            options: {
                ws: null,
                name: null,
                withExport: false,
                width: 1000
            },
            pref: null,
            geneIndex: {}, // {genome_ref -> {feature_id -> feature_index}}
            genomeNames: {}, // {genome_ref -> genome_name}
            genomeRefs: {}, // {genome_ref -> workspace/genome_object_name}
            loaded: false,
            init: function (options) {
                this._super(options);

                this.workspace = new Workspace(this.runtime.config('services.workspace.url', {
                    token: this.runtime.service('session').getAuthToken()
                }));
                this.pref = this.genUUID();
                this.geneIndex = {};
                this.genomeNames = {};
                this.genomeRefs = {};
                var container = this.$elem;
                container.empty();
                container.html(html.loading('loading pan-genome data...'));
                this.render();
                return this;
            },
            render: function () {
                var self = this,
                    name = this.options.name,
                    container = this.$elem;

                if (!this.runtime.service('session').isLoggedIn()) {
                    container.empty();
                    container.append("<div>[Error] You're not logged in</div>");
                    return;
                }

                this.workspace.get_objects([{
                        workspace: this.options.ws,
                        name: name
                    }])
                    .then(function (data) {
                        if (self.loaded) {
                            return;
                        }
                        var data2 = data[0].data;
                        self.cacheGeneFunctions(data2.genome_refs, function () {
                            buildTable(data2);
                        });
                    })
                    .catch(function (err) {
                        container.empty();
                        container.append('<div class="alert alert-danger">' +
                            err.error.message + '</div>');
                    });

                function buildTable(data) {
                    self.loaded = true;
                    container.empty();
                    var tabPane = $('<div id="' + self.pref + 'tab-content">');
                    container.append(tabPane);
                    var tabs = tabPane.kbTabs({tabs: []});
                    var showOverview = true;
                    if (self.options.withExport) {
                        showOverview = false;
                    }
                    ///////////////////////////////////// Statistics ////////////////////////////////////////////
                    var tabStat = $("<div/>");
                    tabs.addTab({name: 'Overview', content: tabStat, active: showOverview, removable: false});

                    var tableOver = $('<table class="table table-striped table-bordered" ' +
                        'style="margin-left: auto; margin-right: auto;" id="' + self.pref + 'overview-table"/>');
                    tabStat.append(tableOver);
                    tableOver.append('<tr><td>Pan-genome object ID</td><td>' + self.options.name + '</td></tr>');

                    var genomeStat = {};  // genome_ref -> [ortholog_count,{ortholog_id -> count_of_genes_from_genome},genes_covered_by_homolog_fams, orphan_genes(1-member_orthologs)]
                    var orthologStat = {};  // ortholog_id -> {genome_ref -> gene_count(>0)}
                    var genesInHomFams = {};  // genome_ref/feature_id -> 0/1(depending_on_homology)
                    var totalGenesInOrth = 0;
                    var totalOrthologs = 0;
                    var totalHomFamilies = 0;
                    var totalOrphanGenes = 0;
                    for (var i in data.orthologs) {
                        var orth = data.orthologs[i];
                        totalOrthologs++;
                        var orth_id = orth.id;
                        var orth_size = orth.orthologs.length;
                        if (orth_size >= 2)
                            totalHomFamilies++;
                        if (!orthologStat[orth_id])
                            orthologStat[orth_id] = [orth_size, {}];
                        for (var j in orth.orthologs) {
                            var gene = orth.orthologs[j];
                            var genomeRef = gene[2];
                            if (!genomeStat[genomeRef])
                                genomeStat[genomeRef] = [0, {}, 0, 0];
                            if (!genomeStat[genomeRef][1][orth_id]) {
                                genomeStat[genomeRef][1][orth_id] = 0;
                                if (orth_size > 1) {
                                    genomeStat[genomeRef][0]++;
                                } else {
                                    genomeStat[genomeRef][3]++;
                                }
                            }
                            genomeStat[genomeRef][1][orth_id]++;
                            if (!orthologStat[orth_id][1][genomeRef])
                                orthologStat[orth_id][1][genomeRef] = 0;
                            orthologStat[orth_id][1][genomeRef]++;
                            var geneKey = genomeRef + "/" + gene[0];
                            if (!genesInHomFams[geneKey]) {
                                if (orth_size > 1) {
                                    genesInHomFams[geneKey] = 1;
                                    totalGenesInOrth++;
                                    genomeStat[genomeRef][2]++;
                                } else {
                                    genesInHomFams[geneKey] = 0;
                                    totalOrphanGenes++;
                                }
                            }
                        }
                    }
                    var totalGenomes = 0;
                    var genomeOrder = [];  // [[genome_ref, genome_name, genome_num]]
                    for (var genomeRef in self.geneIndex) {
                        totalGenomes++;
                        genomeOrder.push([genomeRef, self.genomeNames[genomeRef], 0]);
                    }
                    genomeOrder.sort(function (a, b) {
                        if (a[1] < b[1])
                            return -1;
                        if (a[1] > b[1])
                            return 1;
                        return 0;
                    });
                    for (var i in genomeOrder) {
                        genomeOrder[i][2] = parseInt('' + i) + 1;
                    }
                    tableOver.append('<tr><td>Total # of genomes</td><td><b>' + totalGenomes + '</b></td></tr>');
                    tableOver.append('<tr><td>Total # of proteins</td><td><b>' + (totalGenesInOrth + totalOrphanGenes) + '</b> ' +
                        'proteins, <b>' + totalGenesInOrth + '</b> are in homolog families, <b>' + totalOrphanGenes + '</b> ' +
                        'are in singleton families</td></tr>');
                    tableOver.append('<tr><td>Total # of families</td><td><b>' + totalOrthologs + '</b> families, <b>' +
                        totalHomFamilies + '</b> homolog families, <b>' + (totalOrthologs - totalHomFamilies) + '</b> ' +
                        'singleton families</td></tr>');
                    for (var genomePos in genomeOrder) {
                        var genomeRef = genomeOrder[genomePos][0];
                        var genomeName = self.genomeNames[genomeRef];
                        var orthCount = 0;
                        var genesInOrth = 0;
                        var genesInSingle = 0;
                        if (genomeStat[genomeRef]) {
                            var stat = genomeStat[genomeRef];
                            orthCount = stat[0];
                            genesInOrth = stat[2];
                            genesInSingle = stat[3];
                        }
                        var genesAll = 0;
                        for (var i in self.geneIndex[genomeRef])
                            genesAll++;
                        tableOver.append('<tr><td>' + genomeName + '</td><td><b>' + (genesInOrth + genesInSingle) + '</b> proteins, <b>' +
                            genesInOrth + '</b> proteins are in <b>' + orthCount + '</b> homolog families, <b>' +
                            genesInSingle + '</b> proteins are in singleton families</td></tr>');
                    }

                    ///////////////////////////////////// Shared orthologs ////////////////////////////////////////////
                    var tabShared = $("<div/>");
                    tabs.addTab({name: 'Shared homolog families', content: tabShared, active: false, removable: false});
                    var tableShared = $('<table class="table table-striped table-bordered" ' +
                        'style="margin-left: auto; margin-right: auto;" id="' + self.pref + 'shared-table"/>');
                    tabShared.append(tableShared);
                    var header = "";
                    for (var genomePos in genomeOrder) {
                        var genomeNum = genomeOrder[genomePos][2];
                        header += '<td width="40"><center><b>G' + genomeNum + '</b></center></td>';
                    }
                    tableShared.append('<tr>' + header + '<td/></tr>');
                    for (var genomePos in genomeOrder) {
                        var genomeRef = genomeOrder[genomePos][0];
                        var row = "";
                        for (var genomePos2 in genomeOrder) {
                            var genomeRef2 = genomeOrder[genomePos2][0];
                            var count = 0;
                            for (var orth_id in orthologStat) {
                                if (orthologStat[orth_id][0] <= 1)
                                    continue;
                                if (orthologStat[orth_id][1][genomeRef] && orthologStat[orth_id][1][genomeRef2])
                                    count++;
                            }
                            var color = genomeRef === genomeRef2 ? "#d2691e" : "black";
                            row += '<td width="40"><font color="' + color + '">' + count + '</font></td>';
                        }
                        var genomeNum = genomeOrder[genomePos][2];
                        tableShared.append('<tr>' + row + '<td><b>G' + genomeNum + '</b> - ' + genomeOrder[genomePos][1] + '</td></tr>');
                    }

                    ///////////////////////////////////// Orthologs /////////////////////////////////////////////
                    var tableOrth = $('<table cellpadding="0" cellspacing="0" border="0" class="table table-bordered ' +
                        'table-striped" style="width: 100%; margin-left: 0px; margin-right: 0px;">');
                    var tabOrth = $("<div/>");
                    if (self.options.withExport) {
                        tabOrth.append("<p><b>Please choose homolog family and push 'Export' " +
                            "button on opened ortholog tab.</b></p><br>");
                    }
                    tabOrth.append(tableOrth);

                    tabs.addTab({name: 'Protein families', content: tabOrth, active: !showOverview, removable: false});

                    var orth_data = [];
                    for (var i in data.orthologs) {
                        var orth = data.orthologs[i];
                        var id_text = '<a class="show-orthologs_' + self.pref + '" data-id="' + orth.id + '">' + orth.id + '</a>';
                        var genome_count = 0;
                        for (var genomeRef in orthologStat[orth.id][1]) {
                            genome_count++;
                        }
                        orth_data.push({func: orth['function'], id: id_text, len: orth.orthologs.length, genomes: genome_count});
                    }

                    var tableSettings = {
                        "sPaginationType": "full_numbers",
                        "iDisplayLength": 10,
                        "aaData": orth_data,
                        "aaSorting": [[2, "desc"], [0, "asc"]],
                        "aoColumns": [
                            {"sTitle": "Function", 'mData': 'func'},
                            {"sTitle": "ID", 'mData': 'id'},
                            {"sTitle": "Protein Count", 'mData': 'len'},
                            {"sTitle": "Genome Count", 'mData': 'genomes'}
                        ],
                        "oLanguage": {
//        				            	  "sEmptyTable": "No objects in workspace",

                            // We are moving away from the workspace concept 
                            "sEmptyTable": "No objects found",
                            "sSearch": "Search: "
                        },
                        'fnDrawCallback': events
                    };


                    // create the table
                    tableOrth.dataTable(tableSettings);

                    function events() {
                        // event for clicking on ortholog count
                        $('.show-orthologs_' + self.pref).unbind('click');
                        $('.show-orthologs_' + self.pref).click(function () {
                            var id = $(this).data('id');
                            if (tabs.tabContent(id)[0]) {
                                tabs.showTab(id);
                                return;
                            }
                            var ortholog = getOrthologInfo(id);
                            var tabContent = self.buildOrthoTable(id, ortholog);
                            tabs.addTab({name: id, content: tabContent, active: true, removable: true});
                            tabs.showTab(id);
                        });
                    }

                    // work in progress
                    function getOrthologInfo(id) {
                        //console.log(data)
                        for (var i in data.orthologs) {
                            if (data.orthologs[i].id === id) {
                                //console.log('match');
                                var ort_list = data.orthologs[i];
                                //console.log(ort_list);
                                return ort_list;
                            }
                        }
                    }
                }

                return this;
            },
            cacheGeneFunctions: function (genomeRefs, callback) {
                var self = this,
                    req = genomeRefs.map(function (ref) {
                        return {ref: ref, included: ['scientific_name', 'features/[*]/id']};
                    });
                this.workspace.get_object_subset(req)
                    .then(function (data) {
                        for (var genomePos in genomeRefs) {
                            var ref = genomeRefs[genomePos];
                            self.genomeNames[ref] = data[genomePos].data.scientific_name;
                            self.genomeRefs[ref] = data[genomePos].info[7] + "/" + data[genomePos].info[1];
                            var geneIdToIndex = {};
                            for (var genePos in data[genomePos].data.features) {
                                var gene = data[genomePos].data.features[genePos];
                                geneIdToIndex[gene.id] = genePos;
                            }
                            self.geneIndex[ref] = geneIdToIndex;
                        }
                        callback();
                    })
                    .catch(function (err) {
                        console.log('ERROR cacheGeneFunctions');
                        console.log(err);
                        this.$elem.empty();
                        this.$elem.append('<div class="alert alert-danger">' +
                            err.error.message + '</div>');
                    });
            },
            buildOrthoTable: function (orth_id, ortholog) {
                var self = this;
                var tab = $(html.loading('loading gene data...'));
                var req = [];
                for (var i in ortholog.orthologs) {
                    var genomeRef = ortholog.orthologs[i][2];
                    var featureId = ortholog.orthologs[i][0];
                    var featurePos = self.geneIndex[genomeRef][featureId];
                    req.push({ref: genomeRef, included: ["features/" + featurePos]});
                }
                this.workspace.get_object_subset(req)
                    .then(function (data) {
                        var genes = [];
                        for (var i in data) {
                            var feature = data[i].data.features[0];
                            var genomeRef = req[i].ref;
                            feature["genome_ref"] = genomeRef;
                            var ref = self.genomeRefs[genomeRef];
                            var genome = self.genomeNames[genomeRef];
                            var id = feature.id;
                            var func = feature['function'];
                            if (!func)
                                func = '-';
                            var seq = feature.protein_translation;
                            var len = seq ? seq.length : 'no translation';
                            genes.push({ref: ref, genome: genome, id: id, func: func, len: len, original: feature});
                        }
                        self.buildOrthoTableLoaded(orth_id, genes, tab);
                    })
                    .catch(function (e) {
                        console.log("Error caching genes: " + e.error.message);
                    });
                return tab;
            },
            buildOrthoTableLoaded: function (orth_id, genes, tab) {
                var pref2 = this.genUUID();
                var self = this;
                tab.empty();
                var table = $('<table cellpadding="0" cellspacing="0" border="0" class="table table-bordered ' +
                    'table-striped" style="width: 100%; margin-left: 0px; margin-right: 0px;">');
                if (self.options.withExport) {
                    tab.append('<p><b>Name of feature set object:</b>&nbsp;' +
                        '<input type="text" id="input_' + pref2 + '" ' +
                        'value="' + self.options.name + '.' + orth_id + '.featureset" style="width: 350px;"/>' +
                        '&nbsp;<button id="btn_' + pref2 + '">Export</button><br>' +
                        '<font size="-1">(only features with protein translations will be exported)</font></p><br>'
                        );
                }
                tab.append(table);
                var tableSettings = {
                    "sPaginationType": "full_numbers",
                    "iDisplayLength": 10,
                    "aaData": genes,
                    "aaSorting": [[0, "asc"], [1, "asc"]],
                    "aoColumns": [
                        {"sTitle": "Genome name", 'mData': function (d) {
                                return '<a class="show-genomes_' + pref2 + '" data-id="' + d.ref + '">' +
                                    '<span style="white-space: nowrap;">' + d.genome + '</span></a>';
                            }},
                        {"sTitle": "Feature ID", 'mData': function (d) {
                                return '<a class="show-genes_' + pref2 + '" data-id="' + d.ref + "/" + d.id + '">' + d.id + '</a>';
                            }},
                        {"sTitle": "Function", 'mData': 'func'},
                        {"sTitle": "Protein sequence length", 'mData': 'len'}
                    ],
                    "oLanguage": {
                        "sEmptyTable": "No objects in workspace",
                        "sSearch": "Search: "
                    },
                    'fnDrawCallback': events2
                };

                // create the table
                table.dataTable(tableSettings);
                if (self.options.withExport) {
                    $('#btn_' + pref2).click(function (e) {
                        var target_obj_name = $("#input_" + pref2).val();
                        if (target_obj_name.length === 0) {
                            alert("Error: feature set object name shouldn't be empty");
                            return;
                        }
                        self.exportFeatureSet(orth_id, target_obj_name, genes);
                    });
                }
                function events2() {
                    $('.show-genomes_' + pref2).unbind('click');
                    $('.show-genomes_' + pref2).click(function () {
                        var id = $(this).data('id');
                        var url = "/functional-site/#/genomes/" + id;
                        window.open(url, '_blank');
                    });
                    $('.show-genes_' + pref2).unbind('click');
                    $('.show-genes_' + pref2).click(function () {
                        var id = $(this).data('id');
                        var url = "/functional-site/#/genes/" + id;
                        window.open(url, '_blank');
                    });
                }
            },
            exportFeatureSet: function (orth_id, target_obj_name, genes) {
                var elements = {};
                var size = 0;
                for (var i in genes) {
                    var gene = genes[i];
                    if (gene.original.protein_translation) {
                        elements["" + i] = {data: gene.original};
                        size++;
                    }
                }
                var featureSet = {description: 'Feature set exported from pan-genome "' +
                        this.options.name + '", otholog "' + orth_id + '"', elements: elements};
                this.workspace.save_objects({
                    workspace: this.options.ws,
                    objects: [{type: "KBaseSearch.FeatureSet", name: target_obj_name, data: featureSet}]
                })
                    .then(function (data) {
                        alert("Feature set object containing " + size + " genes " +
                            "was successfuly exported");
                    })
                    .catch(function (err) {
                        alert("Error: " + err.error.message);
                    });
            },
            getData: function () {
                return {title: "Pangenome", id: this.options.name, workspace: this.options.ws};
            },
            loggedInCallback: function (event, auth) {
                this.token = auth.token;
                this.render();
                return this;
            },
            loggedOutCallback: function (event, auth) {
                this.token = null;
                this.render();
                return this;
            },
            genUUID: function () {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }

        });

    });