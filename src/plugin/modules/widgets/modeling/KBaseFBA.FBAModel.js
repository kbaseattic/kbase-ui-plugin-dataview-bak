/*global
 define
 */
/*jslint
 browser: true,
 white: true
 */
define([
    'jquery',
    'kb_service_fba',
    'kb_service_workspace',
    'kb_dataview_widget_modeling_objects'
], function ($, FBA, Workspace, KBObjects) {
    'use strict';
    function KBaseFBA_FBAModel(modeltabs) {
        var self = this;
        this.modeltabs = modeltabs;
        this.runtime = modeltabs.runtime;

        this.setMetadata = function (data) {
            this.workspace = data[7];
            this.objName = data[1];
            this.overview = {
                wsid: data[7] + "/" + data[1],
                ws: data[7],
                obj_name: data[1],
                objecttype: data[2],
                owner: data[5],
                instance: data[4],
                moddate: data[3]
            };

            // if there is user metadata, add it
            if ('Name' in data[10]) {
                this.usermeta = {
                    name: data[10]["Name"],
                    source: data[10]["Source"] + "/" + data[10]["Source ID"],
                    genome: data[10]["Genome"],
                    modeltype: data[10]["Type"],
                    numreactions: data[10]["Number reactions"],
                    numcompounds: data[10]["Number compounds"],
                    numcompartments: data[10]["Number compartments"],
                    numbiomass: data[10]["Number biomasses"],
                    numgapfills: data[10]["Number gapfills"]
                };
                $.extend(this.overview, this.usermeta);
            }
        };

        this.cmpnamehash = {
            "c": "Cytosol",
            "p": "Periplasm",
            "g": "Golgi apparatus",
            "e": "Extracellular",
            "r": "Endoplasmic reticulum",
            "l": "Lysosome",
            "n": "Nucleus",
            "d": "Plastid",
            "m": "Mitochondria",
            "x": "Peroxisome",
            "v": "Vacuole",
            "w": "Cell wall"
        };

        this.tabList = [{
                "key": "overview",
                "name": "Overview",
                "type": "verticaltbl",
                "rows": [{
                        "label": "Name",
                        "key": "name"
                    }, {
                        "label": "ID",
                        "key": "wsid"
                    }, {
                        "label": "Object type",
                        "key": "objecttype",
                        "type": "typelink"
                    }, {
                        "label": "Owner",
                        "key": "owner"
                    }, {
                        "label": "Version",
                        "key": "instance"
                    }, {
                        "label": "Mod-date",
                        "key": "moddate"
                    }, {
                        "label": "Source",
                        "key": "source"
                    }, {
                        "label": "Genome",
                        "key": "genome",
                        "type": "wstype"
                    }, {
                        "label": "Model type",
                        "key": "modeltype"
                    }, {
                        "label": "Number reactions",
                        "key": "numreactions"
                    }, {
                        "label": "Number compounds",
                        "key": "numcompounds"
                    }, {
                        "label": "Number compartments",
                        "key": "numcompartments"
                    }, {
                        "label": "Number biomass",
                        "key": "numbiomass"
                    }, {
                        "label": "Number gapfills",
                        "key": "numgapfills"
                    }
                ]
            }, {
                "key": "modelreactions",
                "name": "Reactions",
                "type": "dataTable",
                "columns": [{
                        "label": "Reaction",
                        "type": "tabLink",
                        "linkformat": "dispIDCompart",
                        "key": "id",
                        "method": "ReactionTab",
                        "width": "15%"
                    }, {
                        "label": "Name",
                        "key": "name"
                    }, {
                        "label": "Equation",
                        "key": "equation",
                        "type": "tabLink",
                        "linkformat": "linkequation"
                    }, {
                        "label": "Genes",
                        "key": "genes",
                        "type": "tabLinkArray",
                        "method": "GeneTab"
                    }]
            }, {
                "key": "modelcompounds",
                "name": "Compounds",
                "type": "dataTable",
                "columns": [{
                        "label": "Compound",
                        "key": "id",
                        "type": "tabLink",
                        "linkformat": "dispIDCompart",
                        "method": "CompoundTab",
                        "width": "15%"
                    }, {
                        "label": "Name",
                        "key": "name"
                    }, {
                        "label": "Formula",
                        "key": "formula"
                    }, {
                        "label": "Charge",
                        "key": "charge"
                    }, {
                        "label": "Compartment",
                        "key": "cmpkbid",
                        "type": "tabLink",
                        "method": "CompartmentTab",
                        "linkformat": "dispID"
                    }]
            }, {
                "key": "modelgenes",
                "name": "Genes",
                "type": "dataTable",
                "columns": [{
                        "label": "Gene",
                        "key": "id",
                        "type": "tabLink",
                        "method": "GeneTab"
                    }, {
                        "label": "Reactions",
                        "key": "reactions",
                        "type": "tabLinkArray",
                        "method": "ReactionTab"
                    }]
            }, {
                "key": "modelcompartments",
                "name": "Compartments",
                "type": "dataTable",
                "columns": [{
                        "label": "Compartment",
                        "key": "id",
                        "type": "tabLink",
                        "method": "CompartmentTab",
                        "linkformat": "dispID"
                    }, {
                        "label": "Name",
                        "key": "name"
                    }, {
                        "label": "pH",
                        "key": "pH"
                    }, {
                        "label": "Potential",
                        "key": "potential"
                    }]
            }, {
                "key": "biomasscpds",
                "name": "Biomass",
                "type": "dataTable",
                "columns": [{
                        "label": "Biomass",
                        "key": "biomass",
                        "type": "tabLink",
                        "method": "BiomassTab",
                        "linkformat": "dispID"
                    }, {
                        "label": "Compound",
                        "key": "id",
                        "type": "tabLink",
                        "linkformat": "dispIDCompart",
                        "method": "CompoundTab"
                    }, {
                        "label": "Name",
                        "key": "name"
                    }, {
                        "label": "Coefficient",
                        "key": "coefficient"
                    }, {
                        "label": "Compartment",
                        "key": "cmpkbid",
                        "type": "tabLink",
                        "linkformat": "dispID",
                        "method": "CompartmentTab"
                    }]
            }, {
                "key": "gapfillings",
                "name": "Gapfilling",
                "type": "dataTable",
                "columns": [{
                        "label": "Gapfill",
                        "key": "simpid",
                        "linkformat": "dispID",
                        "type": "tabLink",
                        "method": "GapfillTab",
                    }, {
                        "label": "Integrated",
                        "key": "integrated"
                    }, {
                        "label": "Media",
                        "key": "media_ref",
                        "linkformat": "dispWSRef",
                        "type": "wstype",
                        "wstype": "KBaseFBA.Media"
                    }]
            } /*{
             "name": "Pathways",
             "widget": "kbasePathways",
             "keys": "workspace, objName",
             "arguments": "model_ws, model_name"
             }*/];


        this.ReactionTab = function (info) {
            var rxn = self.rxnhash[info.id],
                output = [{
                    "label": "Reaction",
                    "data": rxn.dispid
                }, {
                    "label": "Name",
                    "data": rxn.name
                }];
            if ("pathway" in rxn) {
                output.push({
                    "label": "Pathway",
                    "data": rxn.pathway
                });
            }
            if ("reference" in rxn) {
                output.push({
                    "label": "Reference",
                    "data": rxn.reference
                });
            }
            output.push({
                "label": "Compartment",
                "data": self.cmphash[rxn.cmpkbid].name + " " + self.cmphash[rxn.cmpkbid].compartmentIndex
            }, {
                label: "Equation",
                data: rxn.equation,
                type: "pictureEquation"
            }, {
                "label": "GPR",
                "data": rxn.gpr
            });
            if (rxn.rxnkbid !== "rxn00000") {
                var fba = new FBA(self.runtime.getConfig('services.fba.url'), {
                    token: self.runtime.service('session').getAuthToken()
                });
                return fba.get_reactions({
                    reactions: [rxn.rxnkbid],
                    biochemistry: self.biochem,
                    biochemistry_workspace: self.biochemws
                })
                    .then(function (data) {
                        if ("deltaG" in data[0]) {
                            output.push({
                                "label": "Delta G",
                                "data": data[0].deltaG + " (" + data[0].deltaGErr + ") kcal/mol"
                            });
                        }
                        output.push({
                            "label": "Enzymes",
                            "data": data[0].enzymes.join(", ")
                        });
                        var aliashash = {};
                        var finalaliases = [];
                        for (var i = 0; i < data[0].aliases.length; i++) {
                            if (!(data[0].aliases[i] in aliashash)) {
                                finalaliases.push(data[0].aliases[i]);
                                aliashash[data[0].aliases[i]] = 1;
                            }
                        }
                        output.push({
                            "label": "Aliases",
                            "data": finalaliases.join(", ")
                        });
                        return output;
                    });
            }
            return output;
        };

        this.GeneTab = function (info) {
            // var gene = this.genehash[id];
            // doing this instead of creating hash
            var data;
            self.modelgenes.forEach(function (gene) {
                if (gene.id === info.id)
                    data = [{
                            label: "ID",
                            data: gene.id
                        }, {
                            label: "Reactions",
                            data: gene.reactions,
                            type: "tabLinkArray",
                            method: "ReactionTab"
                        }];
            });
            return data;
        };

        this.CompoundTab = function (info) {
            var cpd = self.cpdhash[info.id];
            var output = [{
                    "label": "Compound",
                    "data": cpd.dispid
                }, {
                    "label": "Name",
                    "data": cpd.name
                }, {
                    "label": "Formula",
                    "data": cpd.formula
                }, {
                    "label": "Charge",
                    "data": cpd.charge
                }, {
                    "label": "Compartment",
                    "data": cpd.cmpkbid,
                    "dispid": self.cmphash[cpd.cmpkbid].name + " " + self.cmphash[cpd.cmpkbid].compartmentIndex,
                    "type": "tabLink",
                    "function": "CompartmentTab"
                }];
            if (cpd.cpdkbid !== "cpd00000") {
                var fba = new FBA(self.runtime.getConfig('services.fba.url'), {
                    token: self.runtime.service('session').getAuthToken()
                });
                return fba.get_compounds({
                    compounds: [cpd.cpdkbid],
                    biochemistry: self.biochem,
                    biochemistry_workspace: self.biochemws
                })
                    .then(function (data) {
                        if ("deltaG" in data[0]) {
                            output.push({
                                "label": "Delta G",
                                "data": data[0].deltaG + " (" + data[0].deltaGErr + ") kcal/mol"
                            });
                        }
                        var aliashash = {};
                        var finalaliases = [];
                        for (var i = 0; i < data[0].aliases.length; i++) {
                            if (!(data[0].aliases[i] in aliashash)) {
                                finalaliases.push(data[0].aliases[i]);
                                aliashash[data[0].aliases[i]] = 1;
                            }
                        }
                        output.push({
                            "label": "Aliases",
                            "data": finalaliases.join(", ")
                        });
                        return output;
                    });
            }
            return output;
        };

        this.CompartmentTab = function (info) {
            var cmp = self.cmphash[info.id];
            var output = [{
                    "label": "Compartment",
                    "data": cmp.id
                }, {
                    "label": "Name",
                    "data": cmp.name
                }, {
                    "label": "pH",
                    "data": cmp.pH
                }, {
                    "label": "potential",
                    "data": cmp.potential
                }];
            return output;
        };

        this.BiomassTab = function (info) {
            var bio = self.biohash[info.id];
            var output = [{
                    "label": "Biomass",
                    "data": bio.id
                }, {
                    "label": "Name",
                    "data": bio.name
                }, {
                    "label": "DNA fraction",
                    "data": bio.dna
                }, {
                    "label": "RNA fraction",
                    "data": bio.RNA
                }, {
                    "label": "Protein fraction",
                    "data": bio.protein
                }, {
                    "label": "Cell wall fraction",
                    "data": bio.cellwall
                }, {
                    "label": "Lipid fraction",
                    "data": bio.lipid
                }, {
                    "label": "Cofactor fraction",
                    "data": bio.cofactor
                }, {
                    "label": "Other fraction",
                    "data": bio.other
                }, {
                    "label": "Energy mols",
                    "data": bio.energy
                }, {
                    "label": "Equation",
                    "data": bio.equation
                }];
            return output;
        };

        this.GapfillTab = function (info) {
            var gfid = info.id;
            var gf = self.gfhash[gfid];
            var ref;
            if ("gapfill_ref" in gf) {
                ref = gf.gapfill_ref;
            } else if ("fba_ref" in gf) {
                ref = gf.fba_ref;
            }
            if ("output" in gf) {
                return gf.output;
            }
            var workspace = new Workspace(this.runtime.getConfig('services.workspace.url'), {
                token: this.runtime.service('session').getAuthToken()
            });
            return workspace.get_objects([{ref: ref}])
                .then(function (data) {
                    var solutions = data[0].data.gapfillingSolutions;
                    return self.parse_gf_solutions(solutions);
                })
                .then(function (solutions) {
                    if (gf.integrated === "1") {
                        gf.integrated = "yes";
                    } else if (gf.integrated === "0") {
                        gf.integrated = "no";
                    }
                    gf.output = [{
                            "label": "Gapfill ID",
                            "data": gf.simpid
                        }, {
                            "label": "Media",
                            "linkformat": "dispWSRef",
                            "type": "wstype",
                            "wstype": "KBaseFBA.Media",
                            "data": gf.media_ref
                        }, {
                            "label": "Integrated",
                            "data": gf.integrated
                        }];
                    if (gf.integrated === "yes") {
                        gf.output.push({
                            "label": "Integrated solution",
                            "data": gf.integrated_solution
                        });
                    }
                    var rxns = "";
                    for (var i = 0; i < solutions.length; i++) {
                        var solrxns = solutions[i].gapfillingSolutionReactions;
                        for (var j = 0; j < solrxns.length; j++) {
                            if (j > 0) {
                                rxns += "<br>";
                            }
                            rxns += solrxns[j].id;
                            if ("equation" in solrxns[j]) {
                                rxns += ":" + solrxns[j].equation;
                            }
                        }
                    }

                    gf.output.push({
                        "label": "Solution " + i,
                        "data": rxns
                    });
                    return gf.output;
                });
        };

        this.parse_gf_solutions = function (solutions) {
            var rxnshash = {};
            var biochemws = "kbase";
            var biochem = "default";
            for (var i = 0; i < solutions.length; i++) {
                var solrxns = solutions[i].gapfillingSolutionReactions;
                for (var j = 0; j < solrxns.length; j++) {
                    var array = solrxns[j].reaction_ref.split("/");
                    solrxns[j].id = array.pop();
                    if (solrxns[j].id.match(/^rxn\d\d\d\d\d$/) && array[3] === "reactions") {
                        biochemws = array[0];
                        biochem = array[1];
                        rxnshash[solrxns[j].id] = solrxns[j];
                    }
                }
            }
            var ids = new Array();
            for (var key in rxnshash) {
                ids.push(key);
            }
            if (ids.length > 0) {
                var fba = new FBA(this.runtime.getConfig('services.fba.url'), {
                    token: this.runtime.service('session').getAuthToken()
                });
                return fba.get_reactions({
                    reactions: ids,
                    biochemistry: biochem,
                    biochemistry_workspace: biochemws
                })
                    .then(function (data) {
                        for (var i = 0; i < data.length; i++) {
                            if (data[i]) {
                                rxnshash[data[i].id].equation = data[i].definition;
                            }
                        }
                        return solutions;
                    });
            }
            return solutions;
        };

        this.setData = function (indata) {
            this.data = indata;
            this.modelreactions = this.data.modelreactions;
            this.modelcompounds = this.data.modelcompounds;
            this.modelgenes = [];
            this.modelcompartments = this.data.modelcompartments;
            this.biomasses = this.data.biomasses;
            this.biomasscpds = [];
            this.gapfillings = this.data.gapfillings;
            this.cpdhash = {};
            this.biohash = {};
            this.rxnhash = {};
            this.cmphash = {};
            this.genehash = {};
            this.gfhash = {};
            this.biochemws = "kbase";
            this.biochem = "default";
            for (var i = 0; i < this.gapfillings.length; i++) {
                this.gapfillings[i].simpid = "gf." + (i + 1);
                this.gfhash[this.gapfillings[i].simpid] = this.gapfillings[i];
            }
            for (var i = 0; i < this.modelcompartments.length; i++) {
                var cmp = this.modelcompartments[i];
                cmp.cmpkbid = cmp.compartment_ref.split("/").pop();
                cmp.name = self.cmpnamehash[cmp.cmpkbid];
                this.cmphash[cmp.id] = cmp;
            }
            for (var i = 0; i < this.modelcompounds.length; i++) {
                var cpd = this.modelcompounds[i];
                var idarray = cpd.id.split('_');
                cpd.dispid = idarray[0] + "[" + idarray[1] + "]";
                cpd.cmpkbid = cpd.modelcompartment_ref.split("/").pop();
                cpd.cpdkbid = cpd.compound_ref.split("/").pop();
                if (cpd.name === undefined) {
                    cpd.name = cpd.dispid;
                }
                cpd.name = cpd.name.replace(/_[a-zA-z]\d+$/, '');
                this.cpdhash[cpd.id] = cpd;
                if (cpd.cpdkbid !== "cpd00000") {
                    var array = cpd.compound_ref.split("/");
                    this.biochemws = array[0];
                    this.biochem = array[1];
                    this.cpdhash[cpd.cpdkbid + "_" + cpd.cmpkbid] = cpd;
                    if (idarray[0] !== cpd.cpdkbid) {
                        cpd.dispid += "<br>(" + cpd.cpdkbid + ")";
                    }
                }
            }
            for (var i = 0; i < this.biomasses.length; i++) {
                var biomass = this.biomasses[i];
                this.biohash[biomass.id] = biomass;
                biomass.dispid = biomass.id;
                var reactants = "";
                var products = "";
                for (var j = 0; j < biomass.biomasscompounds.length; j++) {
                    var biocpd = biomass.biomasscompounds[j];
                    biocpd.id = biocpd.modelcompound_ref.split("/").pop();
                    var idarray = biocpd.id.split('_');
                    biocpd.dispid = idarray[0] + "[" + idarray[1] + "]";
                    biocpd.name = this.cpdhash[biocpd.id].name;
                    biocpd.formula = this.cpdhash[biocpd.id].formula;
                    biocpd.charge = this.cpdhash[biocpd.id].charge;
                    biocpd.cmpkbid = this.cpdhash[biocpd.id].cmpkbid;
                    biocpd.biomass = biomass.id;
                    this.biomasscpds.push(biocpd);
                    if (biocpd.coefficient < 0) {
                        if (reactants.length > 0) {
                            reactants += " + ";
                        }
                        if (biocpd.coefficient !== -1) {
                            var abscoef = Math.round(-1 * 100 * biocpd.coefficient) / 100;
                            reactants += "(" + abscoef + ") ";
                        }
                        reactants += biocpd.name + "[" + biocpd.cmpkbid + "]";
                    } else {
                        if (products.length > 0) {
                            products += " + ";
                        }
                        if (biocpd.coefficient !== 1) {
                            var abscoef = Math.round(100 * biocpd.coefficient) / 100;
                            products += "(" + abscoef + ") ";
                        }
                        products += biocpd.name + "[" + biocpd.cmpkbid + "]";
                    }
                }
                biomass.equation = reactants + " => " + products;
            }
            for (var i = 0; i < this.modelreactions.length; i++) {
                var rxn = this.modelreactions[i];
                var idarray = rxn.id.split('_');
                rxn.dispid = idarray[0] + "[" + idarray[1] + "]";
                rxn.rxnkbid = rxn.reaction_ref.split("/").pop();
                rxn.cmpkbid = rxn.modelcompartment_ref.split("/").pop();
                rxn.name = rxn.name.replace(/_[a-zA-z]\d+$/, '');
                rxn.gpr = "";
                if (rxn.name === "CustomReaction") {
                    rxn.name = rxn.dispid;
                }
                this.rxnhash[rxn.id] = rxn;
                if (rxn.rxnkbid !== "rxn00000") {
                    this.rxnhash[rxn.rxnkbid + "_" + rxn.cmpkbid] = rxn;
                    if (rxn.rxnkbid !== idarray[0]) {
                        rxn.dispid += "<br>(" + rxn.rxnkbid + ")";
                    }
                }
                var reactants = "";
                var products = "";
                var sign = "<=>";
                if (rxn.direction === ">") {
                    sign = "=>";
                } else if (rxn.direction === "<") {
                    sign = "<=";
                }
                if (rxn.modelReactionProteins > 0) {
                    rxn.gpr = "";
                }
                for (var j = 0; j < rxn.modelReactionReagents.length; j++) {
                    var rgt = rxn.modelReactionReagents[j];
                    rgt.cpdkbid = rgt.modelcompound_ref.split("/").pop();
                    if (rgt.coefficient < 0) {
                        if (reactants.length > 0) {
                            reactants += " + ";
                        }
                        if (rgt.coefficient !== -1) {
                            var abscoef = Math.round(-1 * 100 * rgt.coefficient) / 100;
                            reactants += "(" + abscoef + ") ";
                        }
                        reactants += this.cpdhash[rgt.cpdkbid].name + "[" + this.cpdhash[rgt.cpdkbid].cmpkbid + "]";
                    } else {
                        if (products.length > 0) {
                            products += " + ";
                        }
                        if (rgt.coefficient !== 1) {
                            var abscoef = Math.round(100 * rgt.coefficient) / 100;
                            products += "(" + abscoef + ") ";
                        }
                        products += this.cpdhash[rgt.cpdkbid].name + "[" + this.cpdhash[rgt.cpdkbid].cmpkbid + "]";
                    }
                }
                rxn.ftrhash = {};
                for (var j = 0; j < rxn.modelReactionProteins.length; j++) {
                    var prot = rxn.modelReactionProteins[j];
                    if (j > 0) {
                        rxn.gpr += " or ";
                    }
                    rxn.gpr += "(";
                    for (var k = 0; k < prot.modelReactionProteinSubunits.length; k++) {
                        var subunit = prot.modelReactionProteinSubunits[k];
                        if (k > 0) {
                            rxn.gpr += " and ";
                        }
                        rxn.gpr += "(";
                        if (subunit.feature_refs.length === 0) {
                            rxn.gpr += "Unknown";
                        }
                        for (var m = 0; m < subunit.feature_refs.length; m++) {
                            var ftrid = subunit.feature_refs[m].split("/").pop();
                            rxn.ftrhash[ftrid] = 1;
                            if (m > 0) {
                                rxn.gpr += " or ";
                            }
                            rxn.gpr += ftrid;
                        }
                        rxn.gpr += ")";
                    }
                    rxn.gpr += ")";
                }

                rxn.dispfeatures = "";
                rxn.genes = [];
                for (var gene in rxn.ftrhash) {
                    rxn.genes.push({id: gene});

                    var genes = [];
                    this.modelgenes.forEach(function (item) {
                        genes.push(item.id);
                    });

                    if (genes.indexOf(gene) === -1) {
                        this.modelgenes.push({id: gene, reactions: [{id: rxn.id, dispid: rxn.dispid}]});
                    } else {
                        this.modelgenes[genes.indexOf(gene)].reactions.push({id: rxn.id, dispid: rxn.dispid});
                    }
                }

                rxn.equation = reactants + " " + sign + " " + products;
            }

        };

    }

// make method of base class
    KBObjects.prototype.KBaseFBA_FBAModel = KBaseFBA_FBAModel;
});