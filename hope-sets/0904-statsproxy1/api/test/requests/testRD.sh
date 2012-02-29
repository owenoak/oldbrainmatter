#!/bin/sh

#
# Run tests against RequestDispatcher
#
# Tests:
#   empty request
#   badly formed request
#   single request, not stacked
#   stacked request, empty
#   stacked request, single
#   stacked request, multiple, parallel
#   stacked request, multiple, parallel with errors expecte
#   stacked request, multiple, serial, continue
#   stacked request, multiple, serial, continue with errors
#   stacked request, multiple, serial, stop
#   stacked request, multiple, serial, stop with errors

MIMETYPE="Content-Type:text/xml"
STACKER=./stack
CURL=/usr/bin/curl
PASS=0
FAIL=0
if [ ! $TEST ] ; then
    echo "Please set environment variable TEST to the IP or DNS name of a system to test."
    exit 1
fi

#   1. empty request
echo -n "Test 1: empty request:        "
$CURL -H $MIMETYPE -d @/dev/null http://$TEST/api/ServiceController/latest -s -o test/result-01
diff test/result-01 good/result-01
if [ $? -eq 0 ] ; then
    echo PASS
    PASS=`expr $PASS + 1`
else
    echo FAIL
    FAIL=`expr $FAIL + 1`
fi

#   2. badly formed request
echo -n "Test 2: badly formed request: "
echo foofoofoo | $CURL -H $MIMETYPE -d @- http://$TEST/api/ServiceController/latest -s -o test/result-02
diff test/result-02 good/result-02
if [ $? -eq 0 ] ; then
    echo PASS
    PASS=`expr $PASS + 1`
else
    echo FAIL
    FAIL=`expr $FAIL + 1`
fi

#   3. single request, not stacked
echo -n "Test 3: single, not stacked:  "
cat cfg-request.xml | $CURL -H $MIMETYPE -d @- http://$TEST/api/ServiceController/latest -s -o test/result-03
diff test/result-03 good/result-03
if [ $? -eq 0 ] ; then
    echo PASS
    PASS=`expr $PASS + 1`
else
    echo FAIL
    FAIL=`expr $FAIL + 1`
fi

#   4. stacked request, empty
echo -n "Test 4: stacked, empty:       "
stack /dev/null | $CURL -H $MIMETYPE -d @- http://$TEST/api/ServiceController/latest -s -o test/result-04
diff test/result-04 good/result-04
if [ $? -eq 0 ] ; then
    echo PASS
    PASS=`expr $PASS + 1`
else
    echo FAIL
    FAIL=`expr $FAIL + 1`
fi

#   5. stacked, single
echo -n "Test 5: stacked, single:      "
stack sc-state.xml | $CURL -H $MIMETYPE -d @- http://$TEST/api/ServiceController/latest -s -o test/result-05
grep -q '<result>OK</result>' test/result-05
if [ $? -eq 0 ] ; then
    echo PASS
    PASS=`expr $PASS + 1`
else
    echo FAIL
    FAIL=`expr $FAIL + 1`
fi

#   6. stacked request, multiple, parallel
echo "Remaining tests are all stacked with multiple requests" 
echo -n "Test 6: parallel:             "
stack -o parallel sc-state.xml  sc-state.xml | $CURL -H $MIMETYPE -d @- http://$TEST/api/ServiceController/latest -s -o test/result-06
N=`grep -c '<result>OK</result>' test/result-06`
if [ $N -eq 2 ] ; then
    echo PASS
    PASS=`expr $PASS + 1`
else
    echo FAIL
    FAIL=`expr $FAIL + 1`
fi
unset N

#   7. stacked request, multiple, parallel with errors expected
echo -n "Test 7: parallel, errors:     "
stack -o parallel bogus.xml  sc-state.xml | $CURL -H $MIMETYPE -d @- http://$TEST/api/ServiceController/latest -s -o test/result-07
OK=`grep -c '<result>OK</result>' test/result-07`
ERR=`grep -c '<result>ERROR</result>' test/result-07`
if [ $OK -eq 1 -a $ERR -eq 1 ] ; then
    echo PASS
    PASS=`expr $PASS + 1`
else
    echo FAIL
    FAIL=`expr $FAIL + 1`
fi
unset OK ERR

#   8. stacked request, multiple, serial, continue
echo -n "Test 8: serial, continue:     "
stack -o serial sc-state.xml sc-state.xml sc-state.xml | $CURL -H $MIMETYPE -d @- http://$TEST/api/ServiceController/latest -s -o test/result-08
N=`grep -c '<result>OK</result>' test/result-08`
if [ $N -eq 3 ] ; then
    echo PASS
    PASS=`expr $PASS + 1`
else
    echo FAIL
    FAIL=`expr $FAIL + 1`
fi
unset N

#   9. stacked request, multiple, serial, continue with errors
echo -n "Test 9: serial, cont, errs:   "
stack -o serial -e continue sc-state.xml bogus.xml  sc-state.xml bogus.xml | \
    $CURL -H $MIMETYPE -d @- http://$TEST/api/ServiceController/latest -s -o test/result-09
OK=`grep -c '<result>OK</result>' test/result-09`
NOT=`grep -c '<result>NOT-HANDLED</result>' test/result-09`
ERR=`grep -c '<result>ERROR</result>' test/result-09`
if [ $OK -eq 1 -a $ERR -eq 1 -a $NOT -eq 2 ] ; then
    echo PASS
    PASS=`expr $PASS + 1`
else
    echo "FAIL (OK=$OK ERR=$ERR NOT=$NOT, should be 1,1,2)"
    FAIL=`expr $FAIL + 1`
fi
unset OK ERR

#  10. stacked request, multiple, serial, stop
echo -n "Test 10: serial, stop:        "
stack -o serial -e stop sc-state.xml sc-state.xml sc-state.xml | $CURL -H $MIMETYPE -d @- http://$TEST/api/ServiceController/latest -s -o test/result-10
N=`grep -c '<result>OK</result>' test/result-10`
if [ $N -eq 3 ] ; then
    echo PASS
    PASS=`expr $PASS + 1`
else
    echo FAIL
    FAIL=`expr $FAIL + 1`
fi
unset N


#  11. stacked request, multiple, serial, stop with errors
echo -n "Test 11: serial, stop, errs:  "
stack -o serial -e stop sc-state.xml bogus.xml  sc-state.xml  bogus.xml | \
    $CURL -H $MIMETYPE -d @- http://$TEST/api/ServiceController/latest -s -o test/result-11
OK=`grep -c '<result>OK</result>' test/result-11`
NOT=`grep -c '<result>NOT-HANDLED</result>' test/result-11`
ERR=`grep -c '<result>ERROR</result>' test/result-11`
if [ $OK -eq 1 -a $ERR -eq 1 -a $NOT -eq 0 ] ; then
    echo PASS
    PASS=`expr $PASS + 1`
else
    echo "FAIL (OK=$OK ERR=$ERR NOT=$NOT, should be 1,1,0)"
    FAIL=`expr $FAIL + 1`
fi
unset OK ERR NOT

echo "Test summary: $PASS passed, $FAIL failed tests."

