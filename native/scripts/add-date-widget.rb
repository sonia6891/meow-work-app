#!/usr/bin/env ruby
require 'fileutils'
require 'json'
require 'xcodeproj'

root = File.expand_path('..', __dir__)
project_path = File.join(root, 'ios', 'App', 'App.xcodeproj')
widget_name = 'MeowDateWidget'
widget_dir = File.join(root, 'ios', 'App', widget_name)
source_dir = File.join(root, 'ios-sources')

raise "Missing generated Xcode project" unless File.exist?(project_path)

FileUtils.rm_rf(widget_dir)
FileUtils.mkdir_p(widget_dir)
FileUtils.cp(File.join(source_dir, 'MeowDateWidget.swift'), File.join(widget_dir, 'MeowDateWidget.swift'))
FileUtils.cp(File.join(source_dir, 'MeowDateWidget-Info.plist'), File.join(widget_dir, 'Info.plist'))
FileUtils.cp(File.join(source_dir, 'MeowDateWidget.entitlements'), File.join(widget_dir, 'MeowDateWidget.entitlements'))

asset_catalog = File.join(widget_dir, 'WidgetAssets.xcassets')
image_set = File.join(asset_catalog, 'WidgetCat.imageset')
FileUtils.mkdir_p(image_set)
File.write(File.join(asset_catalog, 'Contents.json'), JSON.pretty_generate({
  'info' => { 'author' => 'xcode', 'version' => 1 }
}))
FileUtils.cp(File.expand_path('../app-icon-v178-512.png', root), File.join(image_set, 'widget-cat.png'))
File.write(File.join(image_set, 'Contents.json'), JSON.pretty_generate({
  'images' => [
    { 'filename' => 'widget-cat.png', 'idiom' => 'universal', 'scale' => '1x' },
    { 'idiom' => 'universal', 'scale' => '2x' },
    { 'idiom' => 'universal', 'scale' => '3x' }
  ],
  'info' => { 'author' => 'xcode', 'version' => 1 }
}))

project = Xcodeproj::Project.open(project_path)
app_target = project.targets.find { |target| target.name == 'App' }
raise "App target not found" unless app_target

if project.targets.any? { |target| target.name == widget_name }
  raise "#{widget_name} target already exists unexpectedly"
end

widget_group = project.main_group.new_group(widget_name, widget_name)
source_ref = widget_group.new_file('MeowDateWidget.swift')
info_ref = widget_group.new_file('Info.plist')
assets_ref = widget_group.new_file('WidgetAssets.xcassets')

widget_target = project.new_target(:app_extension, widget_name, :ios, '15.0')
widget_target.add_file_references([source_ref])
widget_target.resources_build_phase.add_file_reference(assets_ref, true)

widget_target.build_configurations.each do |config|
  settings = config.build_settings
  settings['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
  settings['CODE_SIGN_ENTITLEMENTS'] = "#{widget_name}/MeowDateWidget.entitlements"
  settings['CODE_SIGN_STYLE'] = 'Automatic'
  settings['CURRENT_PROJECT_VERSION'] = '1'
  settings['GENERATE_INFOPLIST_FILE'] = 'NO'
  settings['INFOPLIST_FILE'] = "#{widget_name}/Info.plist"
  settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
  settings['MARKETING_VERSION'] = '1.0'
  settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.lumilab.meowwork.widget'
  settings['PRODUCT_NAME'] = '$(TARGET_NAME)'
  settings['SKIP_INSTALL'] = 'YES'
  settings['SWIFT_VERSION'] = '5.0'
  settings['TARGETED_DEVICE_FAMILY'] = '1'
end

app_target.add_dependency(widget_target)
embed_phase = app_target.copy_files_build_phases.find { |phase| phase.name == 'Embed Foundation Extensions' }
embed_phase ||= app_target.new_copy_files_build_phase('Embed Foundation Extensions')
embed_phase.dst_subfolder_spec = '13'
unless embed_phase.files_references.include?(widget_target.product_reference)
  embed_phase.add_file_reference(widget_target.product_reference, true)
end

project.save
puts "Added #{widget_name} WidgetKit extension with small, medium and large date/payday widgets."
