require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'react-native-lego-api-logger'
  s.module_name  = 'LegoApiLogger'
  s.version      = package['version']
  s.summary      = package['description']
  s.description  = package['description']
  s.homepage     = 'https://github.com/cashify/react-native-lego-api-logger'
  s.license      = 'MIT'
  s.authors      = { 'Cashify' => 'engineering@cashify.in' }
  s.platforms    = { :ios => '13.0' }
  s.source       = { :git => 'https://github.com/cashify/react-native-lego-api-logger.git', :tag => "v#{s.version}" }

  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.requires_arc = true
  s.swift_version = '5.0'

  s.dependency 'React-Core'
end
