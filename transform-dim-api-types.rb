#!/usr/bin/ruby

ARGF.each_line do |line|
  filename = /.*\/(.*?)\.ts/ =~ line
  print "export * from './#{$1}';\n"
end
