#!/usr/bin/python

from pymitter import EventEmitter
from collections import namedtuple
import urllib2
import websocket
import thread
import time
from websocket import create_connection
import json
import time
import datetime
import message_pb2
import requests
import logging


logging.basicConfig()


class CommanderPy(EventEmitter):

    def __init__(self, address, port):
        EventEmitter.__init__(self)
        self.address = address
        self.port = port
        self.subscribers = []
        self.activeInstances = []
        #websocket.enableTrace(True)
        self.cmdSeqNum = 0
        self.defaultInstance = None

    def setDefaultInstance(self, name):
        err, self.defaultInstance = self.bindToInstance(name)
        self.emit("connect", self.defaultInstance['name'])

    def getCommandInfo(self, cmd, cb):
        apiUrl = 'http://' + self.address + ':' + `self.port` + '/api';
        url = apiUrl + '/mdb/' + self.defaultInstance['name'] + '/commands' + cmd.get('name')
        cmdInfo = urllib2.urlopen(url).read()
        cb(cmdInfo)

    def getActiveInstanceByName(self, name):
        for instance in self.activeInstances:
            if instance['name'] == name:
                return instance
        return None

    def bindToInstance(self, name):
        def runListener(*args):
                instance['client'].run_forever()
        instance = self.getActiveInstanceByName(name);
        if instance != None:
            # Instance is already bound.  Call the callback with the already bound
            # instance object.
            return None, instance
        else:
            # Instance is not bound.  Open a websocket to the server.
            url = 'ws://' + self.address + ':' + `self.port` + '/' + name + '/_websocket'
            instance = {'tlmSeqNum': 0, 'name': name, 'client':websocket.WebSocketApp(url,
                                                   on_message = self.onWsMessage,
                                                   on_error = self.onWsError,
                                                   on_close = self.onWsClose)}
            instance['client'].on_open = self.onWsOpen
            self.activeInstances.append(instance)
            thread.start_new_thread(runListener, ())
            return None, instance

    def onWsMessage(self, ws, message):
        obj = json.loads(message)
        #if obj[1] == 1:
        #    # Request
        #    print "Request"
        if obj[1] == 2:
            # Reply
            print "Reply"
        elif obj[1] == 3:
            # Exception
            print "Exception"
        elif obj[1] == 4:
            # Data
            for param in obj[3]['data']['parameter']:
                for subscriber in self.subscribers:
                    for tlmItem in subscriber['params']['tlm']:
                        if tlmItem['name'] == param['id']['name']:
                            if 'homogeneity' in subscriber['params']:
                                ## First store the parameter so we can compare homogeneity. */
                                tlmItem['sample'] = param;

                                # Get the optional parameters.
                                homogenousBy = 'acquisitionTime';
                                tolerance = 0;
                                if 'by' in subscriber['params']['homogeneity']:
                                    homogenousBy = subscriber['params']['homogeneity']['by']
                                if 'tolerance' in subscriber['params']['homogeneity']:
                                    tolerance = subscriber['params']['homogeneity']['tolerance']

                                # Now determine if the samples are homogenous.  First,
                                # Get the timestamp of the current sample.
                                timeStamp = datetime.datetime.fromtimestamp(param[homogenousBy] / 1000.0)

                                # Now iterate through the remaining samples.  If any
                                # of them fall outside the defined tolerance, flag
                                # this not homogenous.
                                isHomogenous = True
                                for tlmInner in subscriber['params']['tlm']:
                                    if 'sample' in tlmInner:
                                        sample = tlmInner['sample']
                                        sampleTimeStamp = datetime.datetime.fromtimestamp(sample[homogenousBy]/1000.0)
                                        diff = timeStamp - sampleTimeStamp
                                        if diff > datetime.timedelta(milliseconds=float(tolerance)):
                                            isHomogenous = False
                                            break
                                    else:
                                        isHomogenous = False
                                        break
                                if isHomogenous:
                                    # The sample group is homogenous.  Send the subscriber
                                    # an array containing the entire group.
                                    params = []
                                    for tlmInner in subscriber['params']['tlm']:
                                        params.append(tlmInner['sample'])
                                    subscriber['updateFunc'](params)
                            else:
                                # Homogeneity is not defined.  Just give it to the subscriber
                                # as its received.
                                subscriber['updateFunc'](param);

    def onWsError(self, ws, error):
        print error

    def onWsClose(self, ws):
        print "### closed ###"

    def onWsOpen(self, ws):
        print "on_open"

    def subscribeAfterBind(self, args, updateFunc, err, newInstance):
        print "bindComplete"
        #print newInstance
        #self.tlmSeqNum = self.tlmSeqNum + 1;
        # var msgOut = '[1,1,' + self.tlmSeqNum + ',' + JSON.stringify(msg) + ']';

    def subscribe(self, args, updateFunc):
        self.subscribers.append({'tlmSeqNum': 0, 'params':args, 'updateFunc':updateFunc});
        if 'instance' in args:
            # The caller specified an instance.  Get the specific instance.
            instance = self.getActiveInstanceByName(args['instance']);
            if instance == None:
                # We haven't bound this instance yet.  Bind it and defer the
                # subscription to after the bind is complete.
                err, newInstance = self.bindToInstance(args['instance'])
                newInstance['tlmSeqNum'] += 1
                msgOut = '[1,1,' + `newInstance['tlmSeqNum']` + ',{"parameter":"subscribe","data":{"list":' + json.dumps(args['tlm']) + '}}]'
                time.sleep(1)
                newInstance['client'].send(msgOut)
            else:
                # We have already bound this instance.  Just go ahead and subscribe.
                instance['tlmSeqNum'] += 1
                msgOut = '[1,1,' + `instance['tlmSeqNum']` + ',{"parameter":"subscribe","data":{"list":' + json.dumps(args['tlm']) + '}}]'
                instance['client'].send(msgOut)
        else:
            # The caller did not specify an instance.  Go ahead and just use the
            # default instance, if defined.
            self.defaultInstance['tlmSeqNum'] += 1
            msgOut = '[1,1,' + `self.defaultInstance['tlmSeqNum']` + ',{"parameter":"subscribe","data":{"list":' + json.dumps(args['tlm']) + '}}]'
            self.defaultInstance['client'].send(msgOut)

    def sendCommand(self, args):
        cmdMsg = message_pb2.IssueCommandRequest()
        cmdMsg.origin = "user@host"
        cmdMsg.sequenceNumber = self.cmdSeqNum
        cmdMsg.dryRun = False

        assignments = []

        if 'args' in args:
            for arg in args['args']:
                assignment = message_pb2.IssueCommandRequest.Assignment()
                assignment.name = arg['name']
                assignment.value = arg['value']
                assignments.append(assignment)

        cmdMsg.assignment.extend(assignments)
        path = 'http://' + self.address + ':' + `self.port` + '/api/processors/' + self.defaultInstance['name'] + '/realtime/commands/' + args['name'] + '?nolink';
        req = urllib2.Request(path, cmdMsg.SerializeToString(), {'Content-Type': 'application/protobuf', 'Accept': 'application/protobuf'})

        res = urllib2.urlopen(req)
