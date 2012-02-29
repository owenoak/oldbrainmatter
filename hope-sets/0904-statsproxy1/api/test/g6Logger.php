<?php

//  Filename:  $Source: /cvshome/crd/xlr8/src/bin/cloud_common/g6Logger.php,v $
//  Revision:  $Revision: 1.5 $
//  Date:      $Date: 2010-02-25 21:05:00 $
//  Author:    $Author: jbowen $

/*
Software License Agreement (BSD License)

Copyright (c) 2009, Gear Six, Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

* Redistributions of source code must retain the above copyright
  notice, this list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the following disclaimer
  in the documentation and/or other materials provided with the
  distribution.

* Neither the name of Gear Six, Inc. nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/


class g6Logger {
    private static $_instance = NULL;
    private static $_logLevel = NULL;
    private static $_useSyslog = NULL;
    private static $_syslog = NULL;
    private static $_useFile = NULL;
    private static $_filename = NULL;
    private static $_prog = NULL;
    private static $_fp = NULL;

    private function __construct() {
    /* Function __construct - instantiate as private class
        void = __construct()
    */
         self::$_logLevel = LOG_ERR;
         self::$_useSyslog = true;
         self::$_useFile = false;
         self::$_prog = basename($_SERVER['PHP_SELF']);
         openlog(self::$_prog, LOG_PID | LOG_ERR, LOG_LOCAL0);
    }

    private function __clone() {
    /* Function __clone - make clone private
        void = __clone()
    */
    }

    function __destruct() {
    /* Function __destruct - cleanup 
        void = __destruct()
    */
         closelog();
         if (self::$_useFile) {
             fclose(self::$_fp);
         }
    }

    public static function setLogFile($filename) {
    /* Function logToFile - Set filename to log to 
        bool = logToFile(string $filename)
    */
        if (!isset(self::$_instance)) {
            self::$_instance = new g6Logger();
        }
        self::$_fp = @fopen($filename, 'a+');
        if (self::$_fp) {
            self::$_filename = $filename;
            self::$_useFile = true;
            trigger_error('Setting logfile output to: ' . $filename, E_USER_NOTICE);
            return true;
        }
        trigger_error('Error opening ' . $filename . ' to log to.' , E_USER_ERROR);

        return false;
    }

    public static function useSyslog($on) {
    /* Function useSyslog - enable/disable logging to syslog 
        bool = useSyslog(bool $bool)
    */
        if (!isset(self::$_instance)) {
            self::$_instance = new g6Logger();
        }
        if ($on) {
            if (self::$_useSyslog) {
               return true;
            }
            openlog(self::$_prog, LOG_PID | LOG_ERR, LOG_LOCAL0);
            return true;
        } else {
            self::$_useSyslog = false;
            closelog();
        }
        return true;
    }

    public static function log($level, $msg) {
    /* Function log - log message 
        bool = log(int $level, string $msg)
    */
        if (!isset(self::$_instance)) {
            self::$_instance = new g6Logger();
        }

        if (self::$_logLevel >= $level) {
            if (self::$_useSyslog) {
                syslog($level, $msg);
            }

            if (self::$_useFile) {
                $timestamp = date('r');
                fwrite(self::$_fp, $timestamp . ' ' . $msg . "\n");
                fwrite(STDOUT, $timestamp . ' ' . $msg . "\n");
            }
            return true;
        }
        return false;
    }

    public static function setLogLevel($level) {
    /* Function setLogLevel - Set level of logging 
        bool = setLogLevel(int $level)
    */
        if (!isset(self::$_instance)) {
            self::$_instance = new g6Logger();
        }

        switch ($level) {
            case LOG_DEBUG:
                self::$_logLevel = LOG_DEBUG;
                // trigger_error('Setting Loglevel: LOG_DEBUG', E_USER_NOTICE);
                return true;
            break;
            case LOG_INFO:
                self::$_logLevel = LOG_INFO;
                // trigger_error('Setting Loglevel: LOG_INFO', E_USER_NOTICE);
                return true;
            break;
            case LOG_NOTICE:
                self::$_logLevel = LOG_NOTICE;
                // trigger_error('Setting Loglevel: LOG_NOTICE', E_USER_NOTICE);
                return true;
            break;
            case LOG_WARNING:
                self::$_logLevel = LOG_WARNING;
                // trigger_error('Setting Loglevel: LOG_WARNING', E_USER_NOTICE);
                return true;
            break;
            case LOG_ERR:
                self::$_logLevel = LOG_ERR;
                // trigger_error('Setting Loglevel: LOG_ERR', E_USER_NOTICE);
                return true;
            break;
            case LOG_CRIT:
                self::$_logLevel = LOG_CRIT;
                // trigger_error('Setting Loglevel: LOG_CRIT', E_USER_NOTICE);
                return true;
            break;
            case LOG_ALERT:
                self::$_logLevel = LOG_ALERT;
                // trigger_error('Setting Loglevel: LOG_ALERT', E_USER_NOTICE);
                return true;
            break;
            case LOG_EMERG:
                self::$_logLevel = LOG_EMERG;
                // trigger_error('Setting Loglevel: LOG_EMERG', E_USER_NOTICE);
                return true;
            break;
            default:
                trigger_error('Error setting Loglevel: ' . $level
                    , E_USER_ERROR);
                return false;
            break;
        }
    }
}
?>
