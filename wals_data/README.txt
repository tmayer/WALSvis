
WALS Data
=========

WALS Online data export created 2013-10-29 23:06:51.451389 from http://wals.info/

Contents
--------

File Name                                              Size
wals_data/datapoints.tab                             606377
wals_data/values.tab                                  67302
wals_data/features.tab                                 7302
wals_data/languages.tab                              169262

File encoding: utf8


Data Structure
--------------

datapoints.tab contains a matrix of all value assignments for features in WALS.

Rows give the value assignments for a particular language identified by its
WALS code given in the first column,

Columns give the value assignments for a particular feature identified by its
numeric identifier given in the first row.

Descriptions of the values can be looked up in values.tab, using the numeric
feature id and the numeric value id given in the datapoints matrix.

Additional data for languages can be looked up using the WALS code in
languages.tab

Additional data for features can be looked up using the numeric feature id in
features.tab
