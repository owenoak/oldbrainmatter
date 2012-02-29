/* 
	Copyright (c) 2006 Metablocks, Inc, Metablocks, Ltd. and their affiliates. 
	Not to be reused without permission. All Rights Reserved.
	
	Do not remove this copyright notice.
*/


function Sort()
{
}

// If you want to never reverse the sort order, set this to non zero.
Sort.noreverse = 0;

// tablename = "id" tag of the table
// skip = the number of rows to ignore (because of headers or whatnot for example)
// column is the column index in the table


// Standard sort.   Case insensitive alphanumeric sort.
Sort.normal = function( tablename, column, skip )
{
  Sort.sortTable(tablename, column, skip, "normal" );
}

// Numeric specific sort.
Sort.byNumber = function( tablename, column, skip )
{
  Sort.sortTable(tablename, column, skip, "number" );
}

// Date specific sort.
Sort.byDate = function( tablename, column, skip )
{
  Sort.sortTable(tablename, column, skip, "date" );
}

// Euro style date specific sort.
Sort.byDateEuro = function( tablename, column, skip )
{
  Sort.sortTable(tablename, column, skip, "eurodate" );
}


// Main sorting function.   Probably should not call this directly.
// tablename = "id" tag of the table
// skip = the number of rows to ignore (because of headers or whatnot for example)  default is 1
// column is the column index in the table
Sort.sortTable = function(tablename,column, skip, sorttype)
{
  var l;
  var count;
  var colcount;
  var t;
  var index = -1;

  for( i=0; i<Sort.tablecount; i++ )
  {
    if (Sort.tables[i]==tablename)
    {
      index = i;
      // punt the loop in a hack way.
      i = Sort.tablecount;
    }
  }

  // Not initialized yet
  if (index==-1)
  {
    index = Sort.initTable(tablename);
  }
  t = document.getElementById(tablename);

  count = t.rows.length-skip;
  colcount = t.rows[0].cells.length;

  var a = new Array(count);

  for( i=0; i<count; i++ )
  {
    a[i] = new Array(colcount);
    for( j=0; j<colcount; j++)
    {
      a[i][j] = Sort.getText(t.rows[i+skip].cells[j]);
    }
  }

  // Way faster reversing, don't have to sort again if we've already sorted once
  if (Sort.rowsorted[index][column])
  {
    a = Sort.sortlist[index][column];
    // Don't allow reversing if the no reverse flag is set.
    if (Sort.noreverse==0)
    {
	    a.reverse();
    }
  }
  else
  {
    Sort.sortcolumn = column;

    switch( sorttype )
    {
      case "normal":
        a.sort(Sort.typeNoCase);
        break;
      case "number":
        a.sort(Sort.typeByNumber);
        break;
      case "date":
        a.sort(Sort.typeByDate);
        break;
      case "eurodate":
        a.sort(Sort.typeByDateEuro);
        break;
      default:
        a.sort(Sort.typeNoCase);
        break;
    }
    Sort.rowsorted[index][column] = 1;
    Sort.sortlist[index][column] = a;
  }

  for( i=0; i<count; i++ )
  {
    for( j=0; j<colcount; j++)
    {
      Sort.setText(t.rows[i+skip].cells[j], a[i][j]);
    }
  }
}


// Internal sort by alphanumeric, no case
Sort.typeNoCase = function(a, b) 
{
  var rc = 0;

  strA = a[Sort.sortcolumn].toLowerCase();
  strB = b[Sort.sortcolumn].toLowerCase();

  if (strA < strB) 
  { 
    rc = -1; 
  }
  if (strA > strB) 
  { 
    rc = 1; 
  }

  return rc;
}

// Internal sort by date
Sort.typeByDate = function(a, b) 
{
  var rc = 0;

  datA = new Date(a[Sort.sortcolumn]);
  datB = new Date(b[Sort.sortcolumn]);

  if (datA < datB) 
  { 
    rc = -1;
  }
  if (datA > datB) 
  { 
    rc = 1;
  }

  return rc;  
}

// Internal sort by euro date
Sort.typeByDateEuro = function(a, b) 
{
  var rc = 0;
  strA = a[Sort.sortcolumn].split(".");
  strB = b[Sort.sortcolumn].split(".")
  datA = new Date(strA[2], strA[1], strA[0]);
  datB = new Date(strB[2], strB[1], strB[0]);

  if (datA < datB) 
  { 
    rc = -1;
  }
  if (datA > datB) 
  { 
    rc = 1;
  }

  return rc;
}

// Internal sort by Number
Sort.typeByNumber = function(a, b) 
{
  numA = a[Sort.sortcolumn]
  numB = b[Sort.sortcolumn]
  if (isNaN(numA) || isNaN(numB)) 
  { 
    return 0;
  }

  return numA-numB;
}

// Sets up the containers to hold the sorted table information
Sort.initTable = function(tablename)
{
  t = document.getElementById(tablename);
  Sort.tables[Sort.tablecount] = new String(tablename);
  Sort.rowsorted[Sort.tablecount] = new Array(t.rows.length);
  Sort.sortlist[Sort.tablecount] = new Array();

  for( i=0; i<t.rows.length; i++ )
  {
    Sort.rowsorted[Sort.tablecount][i] = 0;
  }

  Sort.tablecount++;
  return( Sort.tablecount-1 );
}

Sort.setBrowser = function()
{
  switch (navigator.appName)
  {
    case "Netscape":
    {
      Sort.getText = Sort.getTextFF;
      break;
    }
    case "Microsoft Internet Explorer":
    {
      Sort.getText = Sort.getTextIE;
      break;
    }
    default:
    {
      Sort.getText = Sort.getTextOther;
      break;
    }
  }
}

// IE specific text nabbing function
Sort.getTextIE = function(c)
{
  return c.innerText;
}

// FireFox specific text nabbing function
Sort.getTextFF = function(c)
{
  return c.textContent;
}

// This is a catch-all text nabbing function.   Probably slow
// but hopefully will work with most other browsers
Sort.getTextOther = function(c)
{
  var r = c.ownerDocument.createRange(); 
  r.selectNodeContents(c); 
  return r.toString(); 
}

// trim leading and trailing whitespace from a string.
Sort.trimString = function(str) {
  return str.replace(/^\s+/g, '').replace(/\s+$/g, '');
}
// Sets the contents of any HTML element.
// In this case it's just being used for table data.
Sort.setText = function(c,s)
{
  var t;
  var h;

  t = Sort.getText(c);
  h = c.innerHTML;

  t = Sort.trimString(t);
  s = Sort.trimString(s);
  c.innerHTML = h.replace(t,s);
}

// Rowsorted is a 2d array, first index is table, second index is row number
// For keeping track of which rows were already sorted, so it doesn't have to 
// sort again (much faster)
// The sorted arrays are kept in "sortlist"
Sort.rowsorted = new Array();
Sort.sortlist = new Array();

// List of table names in the sort list
Sort.tables = new Array();
Sort.tablecount = 0;

// Gets referenced by the sorting function.
Sort.sortcolumn = 0;

// Sets up the cell swapping functions
Sort.setBrowser();

