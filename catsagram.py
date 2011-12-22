#!/usr/bin/python
# Copyright 2010-2011, Carlos Guerreiro
# Licensed under the MIT license

from bottle import route, request, response, static_file
import logging
import sys
import os
import simplejson as json

import traceback

from ReadWriteLock import ReadWriteLock

from threading import Thread
from Queue import Queue
from time import time

import urllib
import urllib2

from instagramclient import clientId, verify_token

instaURL = 'https://api.instagram.com/v1/tags/cat/media/recent?client_id='+ clientId+ '&count=24'

seqLen = 16

class PhotoCache:
    def __init__(self, maxLen):
        self.l = ReadWriteLock()
        self.nextT = int((time() - 1312742671) * 4)
        self.maxLen = maxLen
        self.m = {}
        self.s = []
    
    def update(self, photoId, data):
        self.l.acquireWrite()
        if photoId in self.m:
            oldT, oldData = self.m[photoId]
            data['tagging_id'] = oldData['tagging_id']
            newInfo = (oldT, data)
        else:
            data['tagging_id'] = self.nextT
            newInfo = (self.nextT, data)
            self.nextT = self.nextT + 1
            self.s.append(photoId)
            if len(self.s) > self.maxLen:
                self.s.pop(0)
        self.m[photoId] = newInfo
        self.l.release()
        return newInfo
    
    def dumpLatest(self, n):
        self.l.acquireRead()
        print >> sys.stderr, map(lambda photoId: self.m[photoId][1]['tagging_id'], self.s[-n:])
        self.l.release()
    
    def getLatest(self, n):
        self.l.acquireRead()
        output = []
        for photoId in self.s[-n:]:
            output.append(self.m[photoId][1])
        self.l.release()
        return output


def processUpdates(updates):
    self.l.acquireRead()
    print >> sys.stderr, updates
    self.l.release()

photoCache = PhotoCache(50)

def getUpdates():
    req = urllib2.Request(instaURL)
    resp = urllib2.urlopen(req)
    if resp.code == 200:
        result = json.loads(resp.read())
        if 'data' in result:
            updates = result['data']
            for u in reversed(updates):
                photoId = u['id']
                photoCache.update(photoId, u)

q = Queue()

class Updater(Thread):
    def __init__(self, q):
        Thread.__init__(self)
        self.q = q
    def run(self):
        while True:
            self.q.get()
            try:
                getUpdates()
            except Exception as e:
                logging.error(traceback.format_exc(limit=20))

@route('/latestCatPhotos', method='GET')
def latestCatPhotos():
    try:
        latest = photoCache.getLatest(seqLen)
    except Exception as e:
        logging.error(traceback.format_exc(limit=20))
        
    return json.dumps(latest)

def isSubVerification(params):
    return 'hub.mode' in params and params['hub.mode'] == 'subscribe' and 'hub.verify_token' in params and params['hub.verify_token'] == verify_token

@route('/instagram_callback', method='GET')
def instagram_callback():
    if isSubVerification(request.GET):
        return request.GET['hub.challenge']
    else:
        return ''

@route('/instagram_callback', method='POST')
def instagram_callback_post():
    global q
    q.put('update')
    return ''

root = os.path.dirname(__file__)

@route('/static/:filename')
def server_static(filename):
    return static_file(filename, root+ '/static')

@route('/catsagram')
def server_static():
    return static_file('catsagram.html', root+ '/static')

updater = Updater(q)
updater.daemon = True
updater.start()
