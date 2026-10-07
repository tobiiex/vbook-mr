function execute() {
    var B = "https://metruyenchuvn.org";
    return Response.success([
        { title: "Trang Chủ", input: B, script: "homecontent.js" },
        { title: "Mới Cập Nhật", input: B + "/danh-sach/truyen-moi", script: "homecontent.js" },
        { title: "Truyện Hot", input: B + "/danh-sach/truyen-hot", script: "homecontent.js" }
    ]);
}
